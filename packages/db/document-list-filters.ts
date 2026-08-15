export const documentScopeOptions = ["firm", "candidates", "all"] as const;

export type DocumentScope = (typeof documentScopeOptions)[number];

export const documentScopeLabels: Record<DocumentScope, string> = {
  firm: "Firm",
  candidates: "Candidates",
  all: "All",
};

export function isDocumentScope(value: string): value is DocumentScope {
  return (documentScopeOptions as readonly string[]).includes(value);
}

export function parseDocumentScope(value: string | undefined): DocumentScope {
  if (value && isDocumentScope(value)) {
    return value;
  }
  return "all";
}

type DocumentListItemBase = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

/** A firm document — categorization lives in the many-to-many relation table. */
export type FirmDocumentListItem = DocumentListItemBase & {
  scope: "firm";
  categories: Array<{ id: string; name: string }>;
};

/** A candidate document — category is a column on candidate_document. */
export type CandidateDocumentListItem = DocumentListItemBase & {
  scope: "candidate";
  candidateId: string;
  candidateName: string;
  candidateCategory: string;
};

export type UnifiedDocumentListItem =
  | FirmDocumentListItem
  | CandidateDocumentListItem;
