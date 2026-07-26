import type { CandidateImportDuplicatePolicy } from "@workspace/db/enums";

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

export type ResumeChunk = {
  startPage: number;
  endPage: number;
  headerName: string;
  /** Set when chunk is assigned from Handshake roster email matching. */
  rosterEmail?: string;
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
  metadata?: Record<string, unknown>;
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
  candidateId: string;
  nextcloudFilePath: string;
  metadata: {
    name: string;
    category: string;
    candidateId: string;
    url: string;
  };
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
