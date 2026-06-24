import { extractText } from "unpdf";

export async function extractDocumentText(
  buffer: Uint8Array,
  fileName: string,
): Promise<string> {
  try {
    const result = await extractText(buffer, { mergePages: true });
    if (typeof result.text === "string" && result.text.trim()) {
      return result.text;
    }
    if (Array.isArray(result.text)) {
      return result.text.filter(Boolean).join("\n").trim();
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
