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

/**
 * Import a single resume file (PDF or DOCX) as one candidate. This is the
 * top-level bulk-upload path for individual resumes — distinct from the
 * legacy Handshake multi-resume PDF flow (`processHandshakePdfImport`).
 */
export async function processSingleDocumentImport(args: {
  importId: string;
  buffer: Uint8Array;
  fileName: string;
  positionId?: string | null;
  openaiApiKey?: string;
  services: ImportServices;
}): Promise<ProcessImportResult> {
  const { importId } = args;
  const fileType = args.fileName.toLowerCase().endsWith(".docx")
    ? ("docx" as const)
    : ("pdf" as const);

  importLog("log", "Document import started", {
    step: "single.start",
    importId,
    fileType,
    positionId: args.positionId ?? null,
    bufferBytes: args.buffer.byteLength,
    fileName: args.fileName,
    hasOpenAI: Boolean(args.openaiApiKey),
  });

  const counters = { created: 0, updated: 0, skipped: 0, failed: 0 };

  try {
    await throwIfImportCancelled(importId, {
      total: 1,
      ...counters,
    });

    if (args.services.updateImportProgress) {
      await args.services.updateImportProgress({
        importId: args.importId,
        totalCandidates: 1,
      });
    }

    importLog("log", "Processing document", {
      step: "single.entry.start",
      importId,
      fileType,
      rowIndex: 1,
      totalFiles: 1,
      path: args.fileName,
    });

    const result = await processImportEntry({
      importId,
      stepPrefix: "single",
      fileType,
      buffer: args.buffer,
      fileName: args.fileName,
      sourcePath: args.fileName,
      rowIndex: 1,
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

    const summary = { total: 1, ...counters };

    importLog("log", "Document import completed", {
      step: "single.complete",
      importId,
      fileType,
      ...summary,
    });

    return summary;
  } catch (error) {
    if (error instanceof ImportCancelledError) {
      throw error;
    }
    importLog("error", "Document import failed", {
      step: "single.fatal",
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
