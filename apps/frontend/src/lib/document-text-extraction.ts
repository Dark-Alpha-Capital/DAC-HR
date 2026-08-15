import { extractText as unpdfExtract } from "unpdf";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import * as XLSX from "xlsx";
import { generateText } from "ai";
import { z } from "zod";
import { getOpenAIModel } from "@workspace/ai-config";

export type DocumentFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "text"
  | "legacy-doc"
  | "image"
  | "unknown";

export type DocumentExtractionOptions = {
  openAiApiKey?: string;
};

type JsonPrimitive = string | number | boolean | null;
/** JSON-serializable value; used for structured extraction log fields. */
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export type DocumentExtractionLogger = (
  level: "log" | "warn" | "error",
  message: string,
  data?: Record<string, JsonValue | undefined>,
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

const XLSX_EXTENSIONS = new Set(["xlsx", "xls"]);

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
]);

const IMAGE_OCR_MAX_BYTES = 20 * 1024 * 1024;

export function getFileExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot + 1) : "";
}

export function toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);

  // SAFETY: workflow step results may deserialize Node Buffers as plain
  // `{ type: "Buffer", data: number[] }` objects; this reads that shape.
  const maybeSerialized = data as { type?: string; data?: number[] };
  if (
    maybeSerialized?.type === "Buffer" &&
    Array.isArray(maybeSerialized.data)
  ) {
    return Buffer.from(maybeSerialized.data);
  }

  // SAFETY: the remaining value is a deserialized byte container; Buffer.from
  // accepts any ArrayBufferView / array-like of bytes for these shapes.
  return Buffer.from(data as Uint8Array);
}

export function toUint8Array(
  data: Buffer | Uint8Array | ArrayBuffer,
): Uint8Array {
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
  if (XLSX_EXTENSIONS.has(ext)) return "xlsx";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
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
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return "image";
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image";
    }
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return "image";
    }
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return "image";
    }
    if (bytes.length >= 12) {
      const isRiff =
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46;
      const isWebp =
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50;
      if (isRiff && isWebp) {
        return "image";
      }
    }
    const isLittleEndianTiff =
      bytes[0] === 0x49 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x2a &&
      bytes[3] === 0x00;
    const isBigEndianTiff =
      bytes[0] === 0x4d &&
      bytes[1] === 0x4d &&
      bytes[2] === 0x00 &&
      bytes[3] === 0x2a;
    if (isLittleEndianTiff || isBigEndianTiff) {
      return "image";
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

  const singleText = z.string().safeParse(result?.text);
  if (singleText.success && singleText.data.trim().length > 0) {
    log("log", "PDF text extracted", {
      fileName,
      textLength: singleText.data.length,
      totalPages: result.totalPages,
      elapsedMs: Date.now() - startTime,
    });
    return singleText.data;
  }

  const multiPageText = z.array(z.string()).safeParse(result?.text);
  if (multiPageText.success && multiPageText.data.length > 0) {
    const joined = multiPageText.data.filter(Boolean).join("\n");
    if (joined.trim().length > 0) {
      log("log", "PDF text extracted (multi-page)", {
        fileName,
        textLength: joined.length,
        pageCount: multiPageText.data.length,
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

async function extractPlainText(
  buffer: Buffer | Uint8Array,
  fileName: string,
  startTime: number,
  log: DocumentExtractionLogger,
): Promise<string | null> {
  const rawText = new TextDecoder("utf-8", { fatal: false }).decode(
    toBuffer(buffer),
  );
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

async function extractXlsxText(
  buffer: Buffer | Uint8Array,
  fileName: string,
  startTime: number,
  log: DocumentExtractionLogger,
): Promise<string | null> {
  const workbook = XLSX.read(toBuffer(buffer), { type: "buffer" });

  const sheets = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    return sheet
      ? XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim()
      : "";
  })
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (sheets.length > 0) {
    log("log", "XLSX text extracted", {
      fileName,
      sheetCount: workbook.SheetNames.length,
      textLength: sheets.length,
      elapsedMs: Date.now() - startTime,
    });
    return sheets;
  }

  log("warn", "XLSX extraction returned empty text", {
    fileName,
    elapsedMs: Date.now() - startTime,
  });
  return null;
}

async function extractLegacyDocText(
  buffer: Buffer | Uint8Array,
  fileName: string,
  startTime: number,
  log: DocumentExtractionLogger,
): Promise<string | null> {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(toBuffer(buffer));
  const text = doc.getBody().trim();

  if (text.length > 0) {
    log("log", "Legacy .doc text extracted", {
      fileName,
      textLength: text.length,
      elapsedMs: Date.now() - startTime,
    });
    return text;
  }

  log("warn", "Legacy .doc extraction returned empty text", {
    fileName,
    elapsedMs: Date.now() - startTime,
  });
  return null;
}

async function extractImageText(
  buffer: Buffer | Uint8Array,
  fileName: string,
  startTime: number,
  log: DocumentExtractionLogger,
  openAiApiKey?: string,
): Promise<string | null> {
  const bytes = toBuffer(buffer);

  if (!openAiApiKey) {
    log("warn", "OpenAI API key not provided; skipping image OCR", {
      fileName,
    });
    return null;
  }

  if (bytes.length > IMAGE_OCR_MAX_BYTES) {
    log("warn", "Image exceeds OCR size cap; skipping", {
      fileName,
      sizeBytes: bytes.length,
      capBytes: IMAGE_OCR_MAX_BYTES,
    });
    return null;
  }

  const result = await generateText({
    model: getOpenAIModel(openAiApiKey, "gpt-4o-mini"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: new Uint8Array(bytes),
          },
          {
            type: "text",
            text: "Extract ALL visible text from this image verbatim. Preserve line breaks, table structure, and numbers. Output only the extracted text, with no commentary.",
          },
        ],
      },
    ],
  });

  const text = result.text.trim();

  if (text.length > 0) {
    log("log", "Image text extracted via OCR", {
      fileName,
      textLength: text.length,
      elapsedMs: Date.now() - startTime,
    });
    return text;
  }

  log("warn", "Image OCR returned empty text", {
    fileName,
    elapsedMs: Date.now() - startTime,
  });
  return null;
}

type Extractor = (
  buffer: Buffer | Uint8Array,
  fileName: string,
  startTime: number,
  log: DocumentExtractionLogger,
  openAiApiKey?: string,
) => Promise<string | null>;

/** Known-format extractors, keyed by the detected format. */
const EXTRACTORS = {
  pdf: extractPdfText,
  docx: extractDocxText,
  xlsx: extractXlsxText,
  "legacy-doc": extractLegacyDocText,
  image: extractImageText,
  text: extractPlainText,
} satisfies Record<Exclude<DocumentFormat, "unknown">, Extractor>;

/**
 * Ordered fallback for mis-detected files: try each extractor tolerantly.
 * Matches the legacy inline chain exactly (no legacy-doc in the fallback).
 */
const UNKNOWN_FALLBACK: Array<
  Exclude<DocumentFormat, "unknown" | "legacy-doc">
> = ["pdf", "docx", "xlsx", "image", "text"];

export async function extractTextFromDocument(
  buffer: Buffer | Uint8Array,
  fileName: string,
  log: DocumentExtractionLogger = () => {},
  options: DocumentExtractionOptions = {},
): Promise<string> {
  const bytes = toBuffer(buffer);
  const startTime = Date.now();
  const format = detectFormat(bytes, fileName);

  log("log", "Detecting document format", { fileName, format });

  try {
    if (format === "unknown") {
      for (const candidate of UNKNOWN_FALLBACK) {
        const text = await EXTRACTORS[candidate](
          bytes,
          fileName,
          startTime,
          log,
          options.openAiApiKey,
        ).catch(() => null);
        if (text) return text;
      }
    } else {
      const text = await EXTRACTORS[format](
        bytes,
        fileName,
        startTime,
        log,
        options.openAiApiKey,
      );
      if (text) return text;
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
