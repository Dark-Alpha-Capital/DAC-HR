import { extractText as unpdfExtract } from "unpdf";
import mammoth from "mammoth";

export type DocumentFormat = "pdf" | "docx" | "text" | "legacy-doc" | "unknown";

export type DocumentExtractionLogger = (
  level: "log" | "warn" | "error",
  message: string,
  data?: Record<string, unknown>,
) => void;

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

export function getFileExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot + 1) : "";
}

export function toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
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

export function toUint8Array(data: Buffer | Uint8Array | ArrayBuffer): Uint8Array {
  if (data instanceof Uint8Array && !Buffer.isBuffer(data)) return data;
  return Uint8Array.from(toBuffer(data));
}

export function detectFormat(
  buffer: Buffer | Uint8Array,
  fileName: string,
): DocumentFormat {
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
  log: DocumentExtractionLogger,
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
  log: DocumentExtractionLogger,
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
  log: DocumentExtractionLogger,
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

export async function extractTextFromDocument(
  buffer: Buffer | Uint8Array,
  fileName: string,
  log: DocumentExtractionLogger = () => {},
): Promise<string> {
  const bytes = toBuffer(buffer);
  const startTime = Date.now();
  const format = detectFormat(bytes, fileName);

  log("log", "Detecting document format", { fileName, format });

  try {
    switch (format) {
      case "pdf": {
        const text = await extractPdfText(bytes, fileName, startTime, log);
        if (text) return text;
        break;
      }
      case "docx": {
        const text = await extractDocxText(bytes, fileName, startTime, log);
        if (text) return text;
        break;
      }
      case "legacy-doc":
        log("warn", "Legacy .doc format is not supported; please upload .docx", {
          fileName,
        });
        return "";
      case "text": {
        const text = extractPlainText(bytes, fileName, startTime, log);
        if (text) return text;
        break;
      }
      case "unknown": {
        const pdfText = await extractPdfText(bytes, fileName, startTime, log).catch(
          () => null,
        );
        if (pdfText) return pdfText;

        const docxText = await extractDocxText(bytes, fileName, startTime, log).catch(
          () => null,
        );
        if (docxText) return docxText;

        const plainText = extractPlainText(bytes, fileName, startTime, log);
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
