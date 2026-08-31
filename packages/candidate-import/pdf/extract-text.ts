import { extractText } from "unpdf";
import { extractDocxText } from "../parsers/extract-docx-text";

export async function extractDocumentText(
  buffer: Uint8Array,
  fileName: string,
): Promise<string> {
  if (fileName.toLowerCase().endsWith(".docx")) {
    return extractDocxText(buffer);
  }

  try {
    const result = await extractText(buffer, { mergePages: true });
    if (Array.isArray(result.text)) {
      return result.text.filter(Boolean).join("\n").trim();
    }
    if (result.text && result.text.trim()) {
      return result.text;
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "warn",
        message: "PDF text extraction failed",
        fileName,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
  return "";
}
