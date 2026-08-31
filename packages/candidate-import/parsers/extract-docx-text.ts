import JSZip from "jszip";

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Extract the plain text of a `.docx` document. A docx is itself a zip whose
 * body lives in `word/document.xml`; we walk its `<w:p>` paragraphs and join
 * the `<w:t>` text runs into lines. Pure and dependency-light (JSZip only),
 * safe for the Workers runtime.
 */
export async function extractDocxText(buffer: Uint8Array): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = zip.file("word/document.xml");
    if (!documentXml) {
      return "";
    }

    const xml = await documentXml.async("string");
    const paragraphs: string[] = [];

    const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
    let paragraphMatch: RegExpExecArray | null;
    while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
      const paragraphBody = paragraphMatch[1] ?? "";
      const textRuns: string[] = [];

      const textRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let textMatch: RegExpExecArray | null;
      while ((textMatch = textRegex.exec(paragraphBody)) !== null) {
        textRuns.push(decodeXmlEntities(textMatch[1] ?? ""));
      }

      const line = textRuns.join("").replace(/\s+/g, " ").trim();
      if (line) {
        paragraphs.push(line);
      }
    }

    return paragraphs.join("\n").trim();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "warn",
        message: "DOCX text extraction failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return "";
  }
}
