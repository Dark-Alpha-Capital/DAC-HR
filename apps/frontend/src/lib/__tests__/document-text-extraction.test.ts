import { describe, expect, test } from "bun:test";
import * as XLSX from "xlsx";

import {
  detectFormat,
  extractTextFromDocument,
  toBuffer,
} from "../document-text-extraction";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff, 0xe0];
const GIF_SIGNATURE = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const BMP_SIGNATURE = [0x42, 0x4d, 0x36, 0x00, 0x00, 0x00];
const TIFF_SIGNATURE = [0x49, 0x49, 0x2a, 0x00];
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

function signatureBuffer(signature: number[]): Buffer {
  return Buffer.from(signature);
}

describe("detectFormat", () => {
  test("detects pdf by extension and signature", () => {
    expect(detectFormat(Buffer.from("junk"), "resume.pdf")).toBe("pdf");
    expect(
      detectFormat(signatureBuffer([0x25, 0x50, 0x44, 0x46, 0x2d]), "resume"),
    ).toBe("pdf");
  });

  test("detects docx by extension and zip signature", () => {
    expect(detectFormat(Buffer.from("junk"), "resume.docx")).toBe("docx");
    expect(detectFormat(signatureBuffer(ZIP_SIGNATURE), "resume")).toBe("docx");
  });

  test("detects legacy .doc by extension and OLE signature", () => {
    expect(detectFormat(Buffer.from("junk"), "resume.doc")).toBe("legacy-doc");
    expect(detectFormat(signatureBuffer(OLE_SIGNATURE), "resume")).toBe(
      "legacy-doc",
    );
  });

  test("detects xlsx by extension", () => {
    expect(detectFormat(Buffer.from("junk"), "spreadsheet.xlsx")).toBe("xlsx");
    expect(detectFormat(Buffer.from("junk"), "spreadsheet.XLSX")).toBe("xlsx");
    expect(detectFormat(Buffer.from("junk"), "spreadsheet.xls")).toBe("xlsx");
  });

  test("detects images by extension", () => {
    expect(detectFormat(Buffer.from("junk"), "photo.png")).toBe("image");
    expect(detectFormat(Buffer.from("junk"), "photo.jpg")).toBe("image");
    expect(detectFormat(Buffer.from("junk"), "photo.jpeg")).toBe("image");
    expect(detectFormat(Buffer.from("junk"), "photo.webp")).toBe("image");
    expect(detectFormat(Buffer.from("junk"), "photo.tiff")).toBe("image");
  });

  test("detects images by signature", () => {
    expect(detectFormat(signatureBuffer(PNG_SIGNATURE), "noext")).toBe("image");
    expect(detectFormat(signatureBuffer(JPEG_SIGNATURE), "noext")).toBe(
      "image",
    );
    expect(detectFormat(signatureBuffer(GIF_SIGNATURE), "noext")).toBe("image");
    expect(detectFormat(signatureBuffer(BMP_SIGNATURE), "noext")).toBe("image");
    expect(detectFormat(signatureBuffer(TIFF_SIGNATURE), "noext")).toBe(
      "image",
    );
  });

  test("detects webp by RIFF/WEBP signature", () => {
    const webp = Buffer.alloc(12);
    webp.write("RIFF", 0, "ascii");
    webp.write("WEBP", 8, "ascii");
    expect(detectFormat(webp, "noext")).toBe("image");
  });

  test("falls back to unknown for unrecognized content", () => {
    expect(detectFormat(Buffer.from("random bytes"), "mystery.bin")).toBe(
      "unknown",
    );
  });
});

describe("extractTextFromDocument", () => {
  test("extracts text from an xlsx workbook", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Role"],
      ["Alice", "Engineer"],
      ["Bob", "Analyst"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const text = await extractTextFromDocument(
      toBuffer(buffer),
      "roster.xlsx",
      () => {},
    );

    expect(text).toContain("Alice");
    expect(text).toContain("Engineer");
    expect(text).toContain("Bob");
  });

  test("skips image OCR when no OpenAI API key is provided", async () => {
    const text = await extractTextFromDocument(
      signatureBuffer(PNG_SIGNATURE),
      "scan.png",
      () => {},
    );
    expect(text).toBe("");
  });
});
