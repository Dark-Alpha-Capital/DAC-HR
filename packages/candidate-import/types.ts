import type { CandidateImportDuplicatePolicy } from "@workspace/db/enums";
import { z } from "zod";

/**
 * An arbitrary JSON object (metadata carried through the import pipeline and
 * persisted as-is). Parsed with zod at the import boundary.
 */
export const jsonObjectSchema = z.record(z.string(), z.json());
export type JsonObject = z.infer<typeof jsonObjectSchema>;

export type ResumeFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  school?: string | null;
  major?: string | null;
  graduationYear?: number | null;
  linkedinUrl?: string | null;
};

export type HandshakeRosterEntry = {
  name: string;
  email: string;
  school?: string | null;
  major?: string | null;
};

/**
 * A contiguous page range of one candidate's resume.
 * `roster` chunks are owned by a Handshake roster entry (email-matched);
 * `header` chunks were detected purely from a name-looking page header.
 */
export type ResumeChunk =
  | {
      kind: "roster";
      startPage: number;
      endPage: number;
      headerName: string;
      rosterEmail: string;
    }
  | {
      kind: "header";
      startPage: number;
      endPage: number;
      headerName: string;
    };

export type ImportProfileInput = {
  school?: string | null;
  major?: string | null;
  graduationYear?: number | null;
  linkedinUrl?: string | null;
  resumeText?: string | null;
};

export type ImportDocumentInput = {
  buffer: Uint8Array;
  fileName: string;
  category: "resume";
};

export type ImportCandidateInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  note?: string | null;
  profile?: ImportProfileInput;
  document?: ImportDocumentInput;
  positionId?: string | null;
  importId: string;
  rowIndex: number;
  duplicatePolicy: CandidateImportDuplicatePolicy;
  metadata?: JsonObject;
};

export type ImportCandidateResult = {
  status: "created" | "updated" | "skipped" | "failed";
  candidateId?: string;
  documentId?: string;
  error?: string;
};

export type NextcloudUploadFn = (args: {
  buffer: Uint8Array;
  fileName: string;
  folderPath: string;
}) => Promise<{ url: string; filePath: string } | null>;

export type TriggerDocumentIndexingFn = (args: {
  documentId: string;
  nextcloudFilePath: string;
}) => Promise<void>;

export type UpdateImportProgressFn = (args: {
  importId: string;
  totalCandidates?: number;
  processedCandidates?: number;
}) => Promise<void>;

export type ImportServices = {
  uploadToNextcloud: NextcloudUploadFn;
  triggerDocumentIndexing?: TriggerDocumentIndexingFn;
  updateImportProgress?: UpdateImportProgressFn;
};

export type MatchedResume = {
  roster: HandshakeRosterEntry;
  chunk: ResumeChunk;
};

export type CsvRow = {
  rowIndex: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  school?: string | null;
  major?: string | null;
  graduationYear?: number | null;
};

export type ProcessImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

/** Tally a single-row import result into process counters. */
export function tallyImportResult(
  result: ImportCandidateResult,
  counters: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  },
): void {
  switch (result.status) {
    case "created":
      counters.created++;
      break;
    case "updated":
      counters.updated++;
      break;
    case "skipped":
      counters.skipped++;
      break;
    case "failed":
      counters.failed++;
      break;
    default: {
      const _exhaustive: never = result.status;
      void _exhaustive;
      counters.failed++;
    }
  }
}
