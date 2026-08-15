import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import type { VectorizeIndex } from "cloudflare:workers";
import {
  generateEmbeddings,
  chunkText,
  EMBEDDING_DIMENSIONS,
} from "@workspace/ai-config";
import { createNextcloudClient, downloadFile } from "@workspace/nextcloud";
import { db } from "@workspace/db/db";
import { candidateDocument } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { extractTextFromDocument } from "#/lib/document-text-extraction";

type Env = {
  NEXTCLOUD_URL: string;
  NEXTCLOUD_USER: string;
  NEXTCLOUD_PASSWORD: string;
  OPENAI_API_KEY: string;
  VECTORIZE: VectorizeIndex;
};

type Params = {
  documentId: string;
  nextcloudFilePath: string;
};

function log(level: string, message: string, data?: Record<string, unknown>) {
  console[level as "log" | "warn" | "error"](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      workflow: "document-indexing",
      ...data,
      message,
    }),
  );
}

export class DocumentIndexingWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { documentId, nextcloudFilePath } = event.payload;
    const workflowStartTime = Date.now();

    // Step 0: Load the document row. All indexing metadata (candidateId, name,
    // category, url) is already persisted on candidate_document, so the payload
    // only needs documentId + nextcloudFilePath (which has no DB column).
    const { candidateId, name, category, url } = await step.do(
      "load document",
      async () => {
        const [row] = await db
          .select({
            candidateId: candidateDocument.candidateId,
            name: candidateDocument.name,
            category: candidateDocument.category,
            url: candidateDocument.url,
          })
          .from(candidateDocument)
          .where(eq(candidateDocument.id, documentId))
          .limit(1);
        if (!row) {
          throw new Error(`Candidate document ${documentId} not found`);
        }
        return row;
      },
    );
    const namespace = `candidate-${candidateId}`;

    log("log", "Workflow started", {
      instanceId: event.instanceId,
      documentId,
      candidateId,
      namespace,
      fileName: name,
      filePath: nextcloudFilePath,
    });

    // Step 1: Download from Nextcloud
    const buffer = await step.do(
      "download from nextcloud",
      {
        retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
      },
      async () => {
        log("log", "Downloading from Nextcloud", {
          documentId,
          filePath: nextcloudFilePath,
        });

        const client = createNextcloudClient({
          url: this.env.NEXTCLOUD_URL,
          user: this.env.NEXTCLOUD_USER,
          password: this.env.NEXTCLOUD_PASSWORD,
        });
        const downloadResult = await downloadFile({
          client,
          filePathOrUrl: nextcloudFilePath,
        });

        if (!downloadResult.success || !downloadResult.buffer) {
          log("error", "Nextcloud download failed", {
            documentId,
            filePath: nextcloudFilePath,
            error: downloadResult.error,
            code: downloadResult.code,
          });
          throw new Error(
            downloadResult.error ?? "Failed to download file from Nextcloud",
          );
        }

        log("log", "Step completed: download from nextcloud", {
          documentId,
          bytes: downloadResult.buffer.length,
          filePath: downloadResult.filePath,
        });
        return downloadResult.buffer;
      },
    );

    // Step 2: Extract text
    const text = await step.do("extract text", async () => {
      const result = await extractTextFromDocument(buffer, name, log, {
        openAiApiKey: this.env.OPENAI_API_KEY,
      });
      log("log", "Step completed: extract text", {
        documentId,
        textLength: result.length,
        isEmpty: !result || result.trim().length === 0,
      });
      return result;
    });

    if (!text || text.trim().length === 0) {
      log("warn", "Workflow aborted: no text extracted", {
        documentId,
        candidateId,
        fileName: name,
        elapsedMs: Date.now() - workflowStartTime,
      });
      return;
    }

    // Step 3: Chunk text
    const chunks = chunkText(text);
    log("log", "Text chunked", { documentId, chunkCount: chunks.length });

    // Step 4: Generate OpenAI embeddings
    const embeddings = await step.do(
      "generate embeddings",
      {
        retries: { limit: 5, delay: "10 seconds", backoff: "exponential" },
      },
      async () => {
        const result = await generateEmbeddings(chunks);
        log("log", "Step completed: generate embeddings", {
          documentId,
          chunkCount: chunks.length,
          embeddingCount: result.length,
        });
        return result;
      },
    );

    // Step 5: Upsert to Vectorize
    const vectorCount = await step.do(
      "upsert to vectorize",
      {
        retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
      },
      async () => {
        const indexInfo = await this.env.VECTORIZE.describe();
        if (indexInfo.dimensions !== EMBEDDING_DIMENSIONS) {
          throw new Error(
            `Vectorize index expects ${indexInfo.dimensions} dimensions but embeddings use ${EMBEDDING_DIMENSIONS}`,
          );
        }

        const vectors = chunks.map((chunk, i) => ({
          id: `${documentId}-chunk-${i}`,
          values: embeddings[i],
          metadata: {
            documentId,
            candidateId,
            name: name.slice(0, 64),
            category,
            url: url.slice(0, 64),
            chunkIndex: i,
            text: chunk.substring(0, 64),
          },
          namespace,
        }));

        if (
          vectors.some(
            (vector) => vector.values.length !== indexInfo.dimensions,
          )
        ) {
          throw new Error(
            `Embedding vector length does not match index (${indexInfo.dimensions})`,
          );
        }

        log("log", "Upserting vectors to Vectorize", {
          documentId,
          namespace,
          vectorCount: vectors.length,
          dimensions: indexInfo.dimensions,
        });

        for (let i = 0; i < vectors.length; i += 1000) {
          await this.env.VECTORIZE.upsert(vectors.slice(i, i + 1000));
        }

        log("log", "Step completed: upsert to vectorize", {
          documentId,
          namespace,
          vectorCount: vectors.length,
        });
        return vectors.length;
      },
    );

    // Step 6: Wait for Vectorize sync
    await step.do("wait for sync", async () => {
      await step.sleep("vectorize sync delay", 5000);
      log("log", "Step completed: wait for sync", { documentId });
    });

    // Step 7: Update database
    await step.do("update database", async () => {
      await db
        .update(candidateDocument)
        .set({ vectorizeNamespace: namespace })
        .where(eq(candidateDocument.id, documentId));

      log("log", "Step completed: update database", {
        documentId,
        namespace,
      });
    });

    const totalElapsed = Date.now() - workflowStartTime;
    log("log", "Workflow completed successfully", {
      instanceId: event.instanceId,
      documentId,
      candidateId,
      namespace,
      chunkCount: chunks.length,
      vectorCount,
      totalElapsedMs: totalElapsed,
    });
  }
}
