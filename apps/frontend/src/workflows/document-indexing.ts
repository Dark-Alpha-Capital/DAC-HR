import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import type { VectorizeIndex } from "cloudflare:workers";
import {
  generateEmbeddings,
  chunkText,
} from "@workspace/ai-config";
import { createNextcloudClient, downloadFile } from "@workspace/nextcloud";
import { db } from "@workspace/db/db";
import { candidateDocument } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { extractText as unpdfExtract } from "unpdf";
import mammoth from "mammoth";

type Env = {
  NEXTCLOUD_URL: string;
  NEXTCLOUD_USER: string;
  NEXTCLOUD_PASSWORD: string;
  OPENAI_API_KEY: string;
  VECTORIZE: VectorizeIndex;
};

type Params = {
  documentId: string;
  candidateId: string;
  nextcloudFilePath: string;
  metadata: {
    name: string;
    category: string;
    candidateId: string;
    url: string;
  };
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

type DocumentFormat = "pdf" | "docx" | "text" | "legacy-doc" | "unknown";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "html",
  "htm",
  "xml",
  "rtf",
]);

function getFileExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot + 1) : "";
}

function toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);

  // Workflow step results may deserialize buffers as plain objects
  const maybeSerialized = data as { type?: string; data?: number[] };
  if (
    maybeSerialized?.type === "Buffer" &&
    Array.isArray(maybeSerialized.data)
  ) {
    return Buffer.from(maybeSerialized.data);
  }

  return Buffer.from(data as Uint8Array);
}

function toUint8Array(data: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (data instanceof Uint8Array && !Buffer.isBuffer(data)) return data;
  return Uint8Array.from(toBuffer(data));
}

function detectFormat(buffer: Buffer | Uint8Array, fileName: string): DocumentFormat {
  const bytes = toBuffer(buffer);
  const ext = getFileExtension(fileName);

  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "doc") return "legacy-doc";
  if (TEXT_EXTENSIONS.has(ext)) return "text";

  if (bytes.length >= 4) {
    if (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    ) {
      return "pdf";
    }
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      return "docx";
    }
    if (
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0
    ) {
      return "legacy-doc";
    }
  }

  return "unknown";
}

async function extractPdfText(
  buffer: Buffer | Uint8Array,
  fileName: string,
  startTime: number,
): Promise<string | null> {
  const result = await unpdfExtract(toUint8Array(buffer), { mergePages: true });

  if (typeof result?.text === "string" && result.text.trim().length > 0) {
    log("log", "PDF text extracted", {
      fileName,
      textLength: result.text.length,
      totalPages: result.totalPages,
      elapsedMs: Date.now() - startTime,
    });
    return result.text;
  }

  if (Array.isArray(result?.text) && result.text.length > 0) {
    const joined = result.text.filter(Boolean).join("\n");
    if (joined.trim().length > 0) {
      log("log", "PDF text extracted (multi-page)", {
        fileName,
        textLength: joined.length,
        pageCount: result.text.length,
        elapsedMs: Date.now() - startTime,
      });
      return joined;
    }
  }

  log("warn", "PDF extraction returned empty text", {
    fileName,
    elapsedMs: Date.now() - startTime,
  });
  return null;
}

async function extractDocxText(
  buffer: Buffer | Uint8Array,
  fileName: string,
  startTime: number,
): Promise<string | null> {
  const result = await mammoth.extractRawText({
    buffer: toBuffer(buffer),
  });

  if (result.value.trim().length > 0) {
    log("log", "DOCX text extracted", {
      fileName,
      textLength: result.value.length,
      elapsedMs: Date.now() - startTime,
    });
    return result.value;
  }

  log("warn", "DOCX extraction returned empty text", {
    fileName,
    elapsedMs: Date.now() - startTime,
  });
  return null;
}

function extractPlainText(
  buffer: Buffer,
  fileName: string,
  startTime: number,
): string | null {
  const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!rawText.trim()) return null;

  const truncated = rawText.slice(0, 50000);
  log("log", "Plain text extracted", {
    fileName,
    originalLength: rawText.length,
    truncatedLength: truncated.length,
    elapsedMs: Date.now() - startTime,
  });
  return truncated;
}

async function extractText(
  buffer: Buffer | Uint8Array,
  fileName: string,
): Promise<string> {
  const bytes = toBuffer(buffer);
  const startTime = Date.now();
  const format = detectFormat(bytes, fileName);

  log("log", "Detecting document format", { fileName, format });

  try {
    switch (format) {
      case "pdf": {
        const text = await extractPdfText(bytes, fileName, startTime);
        if (text) return text;
        break;
      }
      case "docx": {
        const text = await extractDocxText(bytes, fileName, startTime);
        if (text) return text;
        break;
      }
      case "legacy-doc":
        log("warn", "Legacy .doc format is not supported; please upload .docx", {
          fileName,
        });
        return "";
      case "text": {
        const text = extractPlainText(bytes, fileName, startTime);
        if (text) return text;
        break;
      }
      case "unknown": {
        const pdfText = await extractPdfText(bytes, fileName, startTime).catch(
          () => null,
        );
        if (pdfText) return pdfText;

        const docxText = await extractDocxText(bytes, fileName, startTime).catch(
          () => null,
        );
        if (docxText) return docxText;

        const plainText = extractPlainText(bytes, fileName, startTime);
        if (plainText) return plainText;
        break;
      }
    }
  } catch (err) {
    log("warn", "Text extraction failed", {
      fileName,
      format,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startTime,
    });
  }

  log("warn", "No text could be extracted", { fileName, format });
  return "";
}

export class DocumentIndexingWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { documentId, candidateId, nextcloudFilePath, metadata } =
      event.payload;
    const namespace = `candidate-${candidateId}`;
    const workflowStartTime = Date.now();

    log("log", "Workflow started", {
      instanceId: event.instanceId,
      documentId,
      candidateId,
      namespace,
      fileName: metadata.name,
      filePath: nextcloudFilePath,
    });

    // Step 1: Download from Nextcloud
    const buffer = await step.do("download from nextcloud", {
      retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
    }, async () => {
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
    });

    // Step 2: Extract text
    const text = await step.do("extract text", async () => {
      const result = await extractText(buffer, metadata.name);
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
        fileName: metadata.name,
        elapsedMs: Date.now() - workflowStartTime,
      });
      return;
    }

    // Step 3: Chunk text
    const chunks = chunkText(text);
    log("log", "Text chunked", { documentId, chunkCount: chunks.length });

    // Step 4: Generate OpenAI embeddings
    const embeddings = await step.do("generate embeddings", {
      retries: { limit: 5, delay: "10 seconds", backoff: "exponential" },
    }, async () => {
      const result = await generateEmbeddings(chunks);
      log("log", "Step completed: generate embeddings", {
        documentId,
        chunkCount: chunks.length,
        embeddingCount: result.length,
      });
      return result;
    });

    // Step 5: Upsert to Vectorize
    const vectorCount = await step.do("upsert to vectorize", async () => {
      const vectors = chunks.map((chunk, i) => ({
        id: `${documentId}-chunk-${i}`,
        values: embeddings[i],
        metadata: {
          documentId,
          candidateId,
          name: metadata.name,
          category: metadata.category,
          url: metadata.url,
          chunkIndex: i,
          text: chunk.substring(0, 64),
        },
        namespace,
      }));

      for (let i = 0; i < vectors.length; i += 1000) {
        await this.env.VECTORIZE.upsert(vectors.slice(i, i + 1000));
      }

      log("log", "Step completed: upsert to vectorize", {
        documentId,
        namespace,
        vectorCount: vectors.length,
      });
      return vectors.length;
    });

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
