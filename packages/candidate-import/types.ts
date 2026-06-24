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
  duplicatePolicy: "skip";
  metadata?: Record<string, unknown>;
};

export type ImportCandidateResult = {
  status: "created" | "skipped" | "failed";
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

export type ImportServices = {
  uploadToNextcloud: NextcloudUploadFn;
  triggerDocumentIndexing?: TriggerDocumentIndexingFn;
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
  skipped: number;
  failed: number;
};
