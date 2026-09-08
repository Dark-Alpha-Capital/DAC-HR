import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
  type WorkflowStepContext,
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
  processSingleDocumentImport,
  processZipImport,
  type ImportLogContext,
  type ImportLogLevel,
  type ImportServices,
  type ProcessImportResult,
} from "@workspace/candidate-import";
import { candidatesService } from "#/features/candidates/server/candidates-service";

/** Cloudflare Workflows non-stream step result limit */
const MAX_STEP_RESULT_BYTES = 1024 * 1024;

/** A cancelled import's terminal counters when no partial progress exists. */
const EMPTY_PROCESS_RESULT: ProcessImportResult = {
  total: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
};

type Env = {
  NEXTCLOUD_URL: string;
  NEXTCLOUD_USER: string;
  NEXTCLOUD_PASSWORD: string;
  OPENAI_API_KEY: string;
};

type Params = {
  importId: string;
  uploadedBy: string;
};

type ImportRecord = NonNullable<
  Awaited<ReturnType<typeof candidatesService.getImportById>>
>;

type WorkflowLogContext = Omit<ImportLogContext, "step"> & {
  step?: string;
};

function log(
  level: ImportLogLevel,
  message: string,
  data?: WorkflowLogContext,
) {
  importLog(level, message, {
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

async function downloadImportFile(
  env: Env,
  importRecord: ImportRecord,
): Promise<Uint8Array> {
  const client = createNextcloudClient({
    url: env.NEXTCLOUD_URL,
    user: env.NEXTCLOUD_USER,
    password: env.NEXTCLOUD_PASSWORD,
  });

  log("log", "Downloading from Nextcloud", {
    step: "workflow.download.start",
    importId: importRecord.id,
    fileType: importRecord.type,
    filename: importRecord.filename,
    url: importRecord.originalFileUrl,
  });

  const downloadResult = await downloadFile({
    client,
    filePathOrUrl: importRecord.originalFileUrl,
  });

  if (!downloadResult.success || !downloadResult.buffer) {
    log("error", "Nextcloud download failed", {
      step: "workflow.download.failed",
      importId: importRecord.id,
      fileType: importRecord.type,
      error: downloadResult.error ?? "Unknown error",
      code: downloadResult.code ?? null,
    });
    throw new Error(downloadResult.error ?? "Failed to download import file");
  }

  const buffer = toUint8Array(downloadResult.buffer);

  log("log", "Download complete", {
    step: "workflow.download.done",
    importId: importRecord.id,
    fileType: importRecord.type,
    bufferBytes: buffer.byteLength,
  });

  if (buffer.byteLength > MAX_STEP_RESULT_BYTES) {
    log(
      "log",
      "File exceeds 1 MiB step limit — processing in same step (not persisted between steps)",
      {
        step: "workflow.large_file.inline",
        importId: importRecord.id,
        fileType: importRecord.type,
        bufferBytes: buffer.byteLength,
        limitBytes: MAX_STEP_RESULT_BYTES,
      },
    );
  }

  return buffer;
}

function buildImportServices(env: Env): ImportServices {
  return {
    uploadToNextcloud: async ({ buffer, fileName, folderPath }) => {
      const client = createNextcloudClient({
        url: env.NEXTCLOUD_URL,
        user: env.NEXTCLOUD_USER,
        password: env.NEXTCLOUD_PASSWORD,
      });

      // WebDAV uploads can fail transiently (e.g. 423 lock, 503, network
      // blips) during large bulk imports; retry before surfacing the error.
      let lastError: { code: string; error: string } | null = null;
      const attempts = 3;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        const blob = new Blob([buffer.slice()]);
        const uploadResult = await uploadFile({
          client,
          file: blob,
          fileName,
          folderPath,
        });

        if (
          uploadResult.success &&
          uploadResult.downloadUrl &&
          uploadResult.filePath
        ) {
          return { url: uploadResult.downloadUrl, filePath: uploadResult.filePath };
        }

        lastError = {
          code: uploadResult.code ?? "UPLOAD_FAILED",
          error: uploadResult.error ?? "Failed to upload file",
        };

        if (attempt < attempts) {
          log("warn", "Nextcloud upload failed — retrying", {
            step: "workflow.upload_retry",
            fileName,
            folderPath,
            attempt,
            code: lastError.code,
            error: lastError.error,
          });
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }

      throw new Error(
        `Nextcloud upload failed (${lastError?.code ?? "UPLOAD_FAILED"}): ${lastError?.error ?? "unknown error"} (file: ${fileName})`,
      );
    },
    updateImportProgress: async ({
      importId,
      totalCandidates,
      processedCandidates,
    }) => {
      await candidatesService.updateImportProgress(importId, {
        totalCandidates,
        processedCandidates,
      });
    },
  };
}

async function processImportBuffer(
  env: Env,
  importRecord: ImportRecord,
  fileBuffer: Uint8Array,
): Promise<ProcessImportResult> {
  const type =
    importRecord.type || detectImportTypeFromFilename(importRecord.filename);
  if (!type) {
    throw new Error(`Unsupported import file type: ${importRecord.filename}`);
  }

  log("log", "Dispatching to processor", {
    step: "workflow.dispatch",
    importId: importRecord.id,
    fileType: type,
    filename: importRecord.filename,
    bufferBytes: fileBuffer.byteLength,
  });

  const commonArgs = {
    importId: importRecord.id,
    positionId: importRecord.positionId,
    openaiApiKey: env.OPENAI_API_KEY,
    services: buildImportServices(env),
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
    case "document":
      return processSingleDocumentImport({
        ...commonArgs,
        buffer: fileBuffer,
        fileName: importRecord.filename,
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

    const importRecord = await step.do(
      "load-import",
      async (ctx: WorkflowStepContext) => {
        log("log", "Loading import record", {
          step: "workflow.load_import.start",
          importId,
          attempt: ctx.attempt,
        });

        const record = await candidatesService.getImportById(importId);
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
          status: record.status,
        });

        if (record.status === "pending") {
          await candidatesService.updateImportStatus(importId, "processing");
          log("log", "Status → processing", {
            step: "workflow.status_processing",
            importId,
          });
        }
        return record;
      },
    );

    if (!importRecord) {
      return;
    }

    const processResult = await step
      .do(
        "download-and-process",
        {
          retries: { limit: 2, delay: "10 seconds", backoff: "exponential" },
        },
        async (ctx: WorkflowStepContext) => {
          log("log", "Download + process step started", {
            step: "workflow.download_and_process.start",
            importId,
            fileType: importRecord.type,
            filename: importRecord.filename,
            attempt: ctx.attempt,
          });

          const cancelled = await candidatesService.getImportById(importId);
          if (cancelled?.status === "cancelled") {
            log("log", "Import cancelled before processing", {
              step: "workflow.cancelled",
              importId,
            });
            return EMPTY_PROCESS_RESULT;
          }

          try {
            const fileBuffer = await downloadImportFile(this.env, importRecord);

            log("log", "Processor starting", {
              step: "workflow.process.start",
              importId,
              fileType: importRecord.type,
              bufferBytes: fileBuffer.byteLength,
            });

            const result = await processImportBuffer(
              this.env,
              importRecord,
              fileBuffer,
            );

            log("log", "Processor returned", {
              step: "workflow.process.returned",
              importId,
              fileType: importRecord.type,
              ...result,
            });

            return result;
          } catch (error) {
            // A cancelled import is a terminal outcome, not a step failure:
            // throwing here would trigger the step retry policy, which would
            // re-download the file and lose the processor's partial result.
            if (error instanceof ImportCancelledError) {
              log("log", "Import cancelled during processing", {
                step: "workflow.cancelled",
                importId,
                hasPartialResult: Boolean(error.partialResult),
              });
              return error.partialResult ?? EMPTY_PROCESS_RESULT;
            }
            throw error;
          }
        },
      )
      .catch(async (error) => {
        const message =
          error instanceof Error ? error.message : "Import processing failed";
        const stack = error instanceof Error ? error.stack : undefined;

        log("error", "Download + process failed", {
          step: "workflow.process_failed",
          importId,
          fileType: importRecord.type,
          error: message,
          stack: stack?.split("\n").slice(0, 3).join(" | ") ?? null,
        });
        await candidatesService.updateImportStatus(importId, "failed", {
          error: message,
        });
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

    await step.do("finalize-import", async (ctx: WorkflowStepContext) => {
      log("log", "Finalizing import", {
        step: "workflow.finalize.start",
        importId,
        attempt: ctx.attempt,
        ...processResult,
      });

      const current = await candidatesService.getImportById(importId);
      if (current?.status === "cancelled") {
        log("log", "Skipped finalize — import cancelled", {
          step: "workflow.cancelled",
          importId,
        });
        return;
      }

      const failedCount = processResult.failed;
      const processedCount =
        processResult.created +
        processResult.updated +
        processResult.skipped +
        processResult.failed;

      await candidatesService.updateImportStatus(importId, "completed", {
        totalCandidates: processResult.total,
        processedCandidates: processedCount,
        failedCandidates: failedCount,
      });

      log("log", "Import marked completed", {
        step: "workflow.finalize.done",
        importId,
        total: processResult.total,
        created: processResult.created,
        updated: processResult.updated,
        skipped: processResult.skipped,
        failed: processResult.failed,
      });
    });

    const finalRecord = await candidatesService.getImportById(importId);
    if (finalRecord?.status === "cancelled") {
      log("log", "Workflow stopped — import cancelled", {
        step: "workflow.cancelled",
        importId,
      });
      return;
    }

    await step.do("audit-log", async () => {
      await candidatesService
        .insertAudit({
          userId: uploadedBy,
          action: "candidate_import_completed",
          entityType: "candidate_import",
          entityId: importId,
          details: {
            importId,
            ...processResult,
            elapsedMs: Date.now() - workflowStartTime,
          },
        })
        .catch((error) => {
          log("error", "Audit log failed", {
            step: "workflow.audit_failed",
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
