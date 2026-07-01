import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import {
  createNextcloudClient,
  downloadFile,
  uploadFile,
} from "@workspace/nextcloud";
import {
  detectImportTypeFromFilename,
  importLog,
  ImportCancelledError,
  processCsvImport,
  processHandshakePdfImport,
  processZipImport,
  type ImportServices,
} from "@workspace/candidate-import";
import {
  getCandidateImportById,
  updateCandidateImportStatus,
} from "@workspace/db/repositories/candidate-import-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

type Env = {
  NEXTCLOUD_URL: string;
  NEXTCLOUD_USER: string;
  NEXTCLOUD_PASSWORD: string;
  OPENAI_API_KEY: string;
  DOCUMENT_INDEXING_WORKFLOW?: {
    create: (opts: {
      id: string;
      params: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
};

type Params = {
  importId: string;
  uploadedBy: string;
};

function log(level: string, message: string, data?: Record<string, unknown>) {
  importLog(level as "log" | "warn" | "error", message, {
    step: String(data?.step ?? "workflow"),
    ...data,
  });
}

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function decodeCsvContent(buffer: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

export class CandidateImportWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { importId, uploadedBy } = event.payload;
    const workflowStartTime = Date.now();

    log("log", "Workflow started", {
      step: "workflow.start",
      instanceId: event.instanceId,
      importId,
    });

    const importRecord = await step.do("load-import", async () => {
      const record = await getCandidateImportById(importId);
      if (!record) {
        throw new Error(`Import job not found: ${importId}`);
      }
      if (record.status === "cancelled") {
        log("log", "Import already cancelled — skipping workflow", {
          step: "workflow.cancelled",
          importId,
        });
        return null;
      }
      log("log", "Import record loaded", {
        step: "workflow.load_import",
        importId,
        fileType: record.type,
        filename: record.filename,
        positionId: record.positionId,
      });
      if (record.status === "pending") {
        await updateCandidateImportStatus(importId, "processing");
      }
      return record;
    });

    if (!importRecord) {
      return;
    }

    const fileBuffer = await step.do(
      "download-original",
      {
        retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
      },
      async () => {
        const client = createNextcloudClient({
          url: this.env.NEXTCLOUD_URL,
          user: this.env.NEXTCLOUD_USER,
          password: this.env.NEXTCLOUD_PASSWORD,
        });

        const downloadResult = await downloadFile({
          client,
          filePathOrUrl: importRecord.originalFileUrl,
        });
        if (!downloadResult.success || !downloadResult.buffer) {
          throw new Error(downloadResult.error ?? "Failed to download import file");
        }

        const buffer = toUint8Array(downloadResult.buffer);
        log("log", "Original file downloaded", {
          step: "workflow.download_original",
          importId,
          fileType: importRecord.type,
          bufferBytes: buffer.byteLength,
        });
        return buffer;
      },
    );

    const services: ImportServices = {
      uploadToNextcloud: async ({ buffer, fileName, folderPath }) => {
        const client = createNextcloudClient({
          url: this.env.NEXTCLOUD_URL,
          user: this.env.NEXTCLOUD_USER,
          password: this.env.NEXTCLOUD_PASSWORD,
        });
        const blob = new Blob([Uint8Array.from(buffer)]);
        const result = await uploadFile({
          client,
          file: blob,
          fileName,
          folderPath,
        });
        if (!result.success || !result.downloadUrl || !result.filePath) {
          return null;
        }
        return { url: result.downloadUrl, filePath: result.filePath };
      },
      triggerDocumentIndexing: this.env.DOCUMENT_INDEXING_WORKFLOW
        ? async (args) => {
          await this.env.DOCUMENT_INDEXING_WORKFLOW!.create({
            id: `index-${args.documentId}`,
            params: {
              documentId: args.documentId,
              candidateId: args.candidateId,
              nextcloudFilePath: args.nextcloudFilePath,
              metadata: args.metadata,
            },
          });
        }
        : undefined,
    };

    const processResult = await step
      .do(
        "detect-and-process",
        {
          retries: { limit: 2, delay: "10 seconds", backoff: "exponential" },
        },
        async () => {
          const type =
            importRecord.type ||
            detectImportTypeFromFilename(importRecord.filename);
          if (!type) {
            throw new Error(
              `Unsupported import file type: ${importRecord.filename}`,
            );
          }

          log("log", "Dispatching to processor", {
            step: "workflow.dispatch",
            importId,
            fileType: type,
            filename: importRecord.filename,
          });

          const commonArgs = {
            importId,
            positionId: importRecord.positionId,
            openaiApiKey: this.env.OPENAI_API_KEY,
            services,
          };

          switch (type) {
            case "csv":
              return processCsvImport({
                ...commonArgs,
                content: decodeCsvContent(fileBuffer),
              });
            case "zip":
              return processZipImport({
                ...commonArgs,
                buffer: fileBuffer,
              });
            case "pdf":
              return processHandshakePdfImport({
                ...commonArgs,
                buffer: fileBuffer,
              });
            default: {
              const _exhaustive: never = type;
              throw new Error(`Unhandled import type: ${_exhaustive}`);
            }
          }
        },
      )
      .catch(async (error: unknown) => {
        const current = await getCandidateImportById(importId);
        if (current?.status === "cancelled") {
          log("log", "Import cancelled during processing", {
            step: "workflow.cancelled",
            importId,
          });
          return (
            error instanceof ImportCancelledError
              ? error.partialResult
              : undefined
          ) ?? { total: 0, created: 0, skipped: 0, failed: 0 };
        }

        const message =
          error instanceof Error ? error.message : "Import processing failed";
        log("error", "Processor failed", {
          step: "workflow.process_failed",
          importId,
          error: message,
        });
        await updateCandidateImportStatus(importId, "failed", { error: message });
        throw error;
      });

    if (!processResult) {
      return;
    }

    log("log", "Processor finished", {
      step: "workflow.process_done",
      importId,
      ...processResult,
    });

    await step.do("finalize-import", async () => {
      const current = await getCandidateImportById(importId);
      if (current?.status === "cancelled") {
        return;
      }

      const failedCount = processResult.failed;
      const processedCount =
        processResult.created + processResult.skipped + processResult.failed;

      await updateCandidateImportStatus(importId, "completed", {
        totalCandidates: processResult.total,
        processedCandidates: processedCount,
        failedCandidates: failedCount,
      });
    });

    const finalRecord = await getCandidateImportById(importId);
    if (finalRecord?.status === "cancelled") {
      log("log", "Workflow stopped — import cancelled", {
        step: "workflow.cancelled",
        importId,
      });
      return;
    }

    await step.do("audit-log", async () => {
      await insertAuditLog({
        userId: uploadedBy,
        action: "candidate_import_completed",
        entityType: "candidate_import",
        entityId: importId,
        details: {
          importId,
          ...processResult,
          elapsedMs: Date.now() - workflowStartTime,
        },
      }).catch((error) => {
        log("error", "Audit log failed", {
          importId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    log("log", "Workflow completed", {
      step: "workflow.complete",
      importId,
      ...processResult,
      elapsedMs: Date.now() - workflowStartTime,
    });
  }
}
