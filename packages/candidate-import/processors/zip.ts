import JSZip from "jszip";
import { importLog } from "../logger";
import { ImportCancelledError, throwIfImportCancelled } from "../cancellation";
import { processImportEntry } from "./process-entry";
import {
  tallyImportResult,
  type ImportServices,
  type ProcessImportResult,
} from "../types";

function errorStack(error: Error): string | null {
  return error.stack ?? null;
}

export async function processZipImport(args: {
  importId: string;
  buffer: Uint8Array;
  positionId?: string | null;
  openaiApiKey?: string;
  services: ImportServices;
}): Promise<ProcessImportResult> {
  const { importId } = args;
  const fileType = "zip" as const;

  importLog("log", "ZIP import started", {
    step: "zip.start",
    importId,
    fileType,
    positionId: args.positionId ?? null,
    bufferBytes: args.buffer.byteLength,
    hasOpenAI: Boolean(args.openaiApiKey),
  });

  const counters = { created: 0, updated: 0, skipped: 0, failed: 0 };

  try {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(args.buffer);
    } catch (error) {
      importLog("error", "ZIP parse failed", {
        step: "zip.load_failed",
        importId,
        fileType,
        bufferBytes: args.buffer.byteLength,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? errorStack(error) : null,
      });
      throw error;
    }

    const entries = Object.entries(zip.files).filter(([, file]) => !file.dir);
    const pdfEntries = entries.filter(([path]) =>
      path.toLowerCase().endsWith(".pdf"),
    );
    const docxEntries = entries.filter(([path]) =>
      path.toLowerCase().endsWith(".docx"),
    );
    const candidateEntries = [...pdfEntries, ...docxEntries];
    const otherEntries = entries.filter(
      ([path]) =>
        !path.toLowerCase().endsWith(".pdf") &&
        !path.toLowerCase().endsWith(".docx"),
    );

    importLog("log", "ZIP extracted", {
      step: "zip.extracted",
      importId,
      fileType,
      totalEntries: Object.keys(zip.files).length,
      pdfCount: pdfEntries.length,
      docxCount: docxEntries.length,
      candidateCount: candidateEntries.length,
      otherPaths: otherEntries.map(([path]) => path),
      pdfPaths: pdfEntries.map(([path]) => path),
      docxPaths: docxEntries.map(([path]) => path),
    });

    if (args.services.updateImportProgress) {
      await args.services.updateImportProgress({
        importId: args.importId,
        totalCandidates: candidateEntries.length,
      });
    }

    for (let i = 0; i < candidateEntries.length; i++) {
      await throwIfImportCancelled(importId, {
        total: candidateEntries.length,
        ...counters,
      });

      const [path, file] = candidateEntries[i]!;
      const rowIndex = i + 1;

      importLog("log", "Processing ZIP entry", {
        step: "zip.entry.start",
        importId,
        fileType,
        rowIndex,
        totalFiles: candidateEntries.length,
        path,
      });

      const fileBuffer = await file.async("uint8array");
      const fileName =
        path.split("/").pop() ??
        `resume-${rowIndex}${path.toLowerCase().endsWith(".docx") ? ".docx" : ".pdf"}`;

      const result = await processImportEntry({
        importId,
        stepPrefix: "zip",
        fileType,
        buffer: fileBuffer,
        fileName,
        sourcePath: path,
        rowIndex,
        positionId: args.positionId,
        openaiApiKey: args.openaiApiKey,
        services: args.services,
      });

      tallyImportResult(result, counters);

      if (args.services.updateImportProgress) {
        await args.services.updateImportProgress({
          importId: args.importId,
          processedCandidates:
            counters.created +
            counters.updated +
            counters.skipped +
            counters.failed,
        });
      }
    }

    const summary = {
      total: candidateEntries.length,
      ...counters,
    };

    importLog("log", "ZIP import completed", {
      step: "zip.complete",
      importId,
      fileType,
      ...summary,
    });

    return summary;
  } catch (error) {
    if (error instanceof ImportCancelledError) {
      throw error;
    }
    importLog("error", "ZIP import failed", {
      step: "zip.fatal",
      importId,
      fileType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? errorStack(error) : null,
      created: counters.created,
      updated: counters.updated,
      skipped: counters.skipped,
      failed: counters.failed,
    });
    throw error;
  }
}
