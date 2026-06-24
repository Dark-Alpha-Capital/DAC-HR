import { PDFDocument } from "pdf-lib";

export async function writeChunkPdf(
  sourceBuffer: Uint8Array,
  startPage: number,
  endPage: number,
): Promise<Uint8Array> {
  const sourcePdf = await PDFDocument.load(sourceBuffer);
  const targetPdf = await PDFDocument.create();
  const pageIndices = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage - 1 + i,
  );

  const copiedPages = await targetPdf.copyPages(sourcePdf, pageIndices);
  for (const page of copiedPages) {
    targetPdf.addPage(page);
  }

  return new Uint8Array(await targetPdf.save());
}
