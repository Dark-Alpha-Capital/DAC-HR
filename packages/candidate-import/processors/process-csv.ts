import { importLog } from "../logger";
import { throwIfImportCancelled } from "../cancellation";
import { createCandidateFromImport } from "../unified/create-candidate-from-import";
import { parseCsvContent } from "./csv";
import type { ImportServices, ProcessImportResult } from "../types";

export async function processCsvImport(args: {
  importId: string;
  content: string;
  positionId?: string | null;
  services: ImportServices;
}): Promise<ProcessImportResult> {
  const { importId } = args;
  const fileType = "csv" as const;

  importLog("log", "CSV import started", {
    step: "csv.start",
    importId,
    fileType,
    positionId: args.positionId ?? null,
    contentLength: args.content.length,
  });

  const rows = parseCsvContent(args.content);

  importLog("log", "CSV parsed", {
    step: "csv.parsed",
    importId,
    fileType,
    rowCount: rows.length,
  });

  if (args.services.updateImportProgress) {
    await args.services.updateImportProgress({
      importId: args.importId,
      totalCandidates: rows.length,
    });
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    await throwIfImportCancelled(importId, {
      total: rows.length,
      created,
      skipped,
      failed,
    });

    importLog("log", "Processing CSV row", {
      step: "csv.row.start",
      importId,
      fileType,
      rowIndex: row.rowIndex,
      email: row.email,
      name: `${row.firstName} ${row.lastName}`.trim(),
    });

    const result = await createCandidateFromImport(
      {
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        location: row.location,
        source: "import",
        profile: {
          school: row.school,
          major: row.major,
          graduationYear: row.graduationYear,
        },
        positionId: args.positionId,
        importId: args.importId,
        rowIndex: row.rowIndex,
        duplicatePolicy: "skip",
      },
      args.services,
    );

    if (result.status === "created") created++;
    else if (result.status === "skipped") skipped++;
    else failed++;

    if (args.services.updateImportProgress) {
      await args.services.updateImportProgress({
        importId: args.importId,
        processedCandidates: created + skipped + failed,
      });
    }

    importLog("log", "CSV row finished", {
      step: "csv.row.done",
      importId,
      fileType,
      rowIndex: row.rowIndex,
      status: result.status,
      candidateId: result.candidateId ?? null,
      error: result.error ?? null,
    });
  }

  const summary = { total: rows.length, created, skipped, failed };

  importLog("log", "CSV import completed", {
    step: "csv.complete",
    importId,
    fileType,
    ...summary,
  });

  return summary;
}
