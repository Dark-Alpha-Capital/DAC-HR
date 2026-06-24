import slugify from "slugify";
import { importLog } from "../logger";
import { ImportCancelledError, throwIfImportCancelled } from "../cancellation";
import { createCandidateFromImport } from "../unified/create-candidate-from-import";
import { splitFullName } from "../dedup/normalize-name";
import { extractHandshakeRoster } from "../parsers/extract-handshake-roster";
import {
  extractPerPageText,
  joinPagesText,
} from "../pdf/extract-chunks";
import {
  extractHandshakeResumeChunks,
  matchHandshakeExport,
} from "../pdf/handshake-chunks";
import { writeChunkPdf } from "../pdf/write-chunk-pdf";
import type { ImportServices, ProcessImportResult } from "../types";

export async function processHandshakePdfImport(args: {
  importId: string;
  buffer: Uint8Array;
  positionId?: string | null;
  openaiApiKey?: string;
  services: ImportServices;
}): Promise<ProcessImportResult> {
  const { importId } = args;
  const fileType = "pdf" as const;

  importLog("log", "Handshake PDF import started", {
    step: "pdf.start",
    importId,
    fileType,
    positionId: args.positionId ?? null,
    bufferBytes: args.buffer.byteLength,
    hasOpenAI: Boolean(args.openaiApiKey),
  });

  const pages = await extractPerPageText(args.buffer);

  importLog("log", "PDF pages extracted", {
    step: "pdf.pages_extracted",
    importId,
    fileType,
    pageCount: pages.length,
  });

  const rosterText = joinPagesText(pages, 1, Math.min(2, pages.length));

  importLog("log", "Extracting Handshake roster", {
    step: "pdf.roster_extract_start",
    importId,
    fileType,
    rosterTextLength: rosterText.length,
  });

  const roster = await extractHandshakeRoster(rosterText, args.openaiApiKey);

  importLog("log", "Handshake roster extracted", {
    step: "pdf.roster_extracted",
    importId,
    fileType,
    rosterCount: roster.length,
    rosterNames: roster.map((e) => e.name),
  });

  const chunks = extractHandshakeResumeChunks(pages, roster, 2);

  importLog("log", "Resume chunks detected", {
    step: "pdf.chunks_detected",
    importId,
    fileType,
    chunkCount: chunks.length,
    chunks: chunks.map((c) => ({
      headerName: c.headerName,
      rosterEmail: c.rosterEmail ?? null,
      pages: `${c.startPage}-${c.endPage}`,
    })),
  });

  const { matched, unmatchedRoster, unmatchedChunks } = matchHandshakeExport(
    pages,
    roster,
    2,
  );

  importLog("log", "Roster matched to resume chunks", {
    step: "pdf.roster_matched",
    importId,
    fileType,
    matchedCount: matched.length,
    unmatchedRosterCount: unmatchedRoster.length,
    unmatchedChunkCount: unmatchedChunks.length,
    matches: matched.map((m) => ({
      rosterName: m.roster.name,
      rosterEmail: m.roster.email,
      chunkHeader: m.chunk.headerName,
      pages: `${m.chunk.startPage}-${m.chunk.endPage}`,
    })),
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < matched.length; i++) {
    await throwIfImportCancelled(importId, {
      total: roster.length || matched.length,
      created,
      skipped,
      failed,
    });

    const { roster: entry, chunk } = matched[i]!;
    const rowIndex = i + 1;

    importLog("log", "Processing matched Handshake entry", {
      step: "pdf.match.start",
      importId,
      fileType,
      rowIndex,
      name: entry.name,
      email: entry.email,
      pages: `${chunk.startPage}-${chunk.endPage}`,
    });

    try {
      const split = splitFullName(entry.name);
      const resumeText = joinPagesText(pages, chunk.startPage, chunk.endPage);

      importLog("log", "Writing chunk PDF", {
        step: "pdf.match.write_chunk",
        importId,
        fileType,
        rowIndex,
        pages: `${chunk.startPage}-${chunk.endPage}`,
        resumeTextLength: resumeText.length,
      });

      const pdfBytes = await writeChunkPdf(
        args.buffer,
        chunk.startPage,
        chunk.endPage,
      );
      const fileName = `${slugify(entry.name, { lower: true, strict: true }) || `resume-${rowIndex}`}.pdf`;

      const result = await createCandidateFromImport(
        {
          firstName: split.firstName,
          lastName: split.lastName,
          email: entry.email,
          source: "handshake",
          profile: {
            school: entry.school ?? null,
            major: entry.major ?? null,
            resumeText,
          },
          document: {
            buffer: pdfBytes,
            fileName,
            category: "resume",
          },
          positionId: args.positionId,
          importId: args.importId,
          rowIndex,
          duplicatePolicy: "skip",
          metadata: {
            matchedHeader: chunk.headerName,
            pages: `${chunk.startPage}-${chunk.endPage}`,
          },
        },
        args.services,
      );

      if (result.status === "created") created++;
      else if (result.status === "skipped") skipped++;
      else failed++;

      importLog("log", "Matched Handshake entry finished", {
        step: "pdf.match.done",
        importId,
        fileType,
        rowIndex,
        name: entry.name,
        status: result.status,
        candidateId: result.candidateId ?? null,
        error: result.error ?? null,
      });
    } catch (error) {
      if (error instanceof ImportCancelledError) {
        throw error;
      }
      failed++;
      importLog("error", "Matched Handshake entry failed", {
        step: "pdf.match.error",
        importId,
        fileType,
        rowIndex,
        name: entry.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const entry of unmatchedRoster) {
    failed++;
    importLog("warn", "Unmatched roster entry", {
      step: "pdf.unmatched_roster",
      importId,
      fileType,
      name: entry.name,
      email: entry.email,
    });
  }

  for (const chunk of unmatchedChunks) {
    failed++;
    importLog("warn", "Unmatched resume chunk", {
      step: "pdf.unmatched_chunk",
      importId,
      fileType,
      headerName: chunk.headerName,
      pages: `${chunk.startPage}-${chunk.endPage}`,
    });
  }

  const summary = {
    total: roster.length || matched.length,
    created,
    skipped,
    failed,
  };

  importLog("log", "Handshake PDF import completed", {
    step: "pdf.complete",
    importId,
    fileType,
    ...summary,
  });

  return summary;
}
