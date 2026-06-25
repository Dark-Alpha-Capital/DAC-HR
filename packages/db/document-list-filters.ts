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

export function parseDocumentScope(
  value: string | undefined,
): DocumentScope {
  if (value && isDocumentScope(value)) {
    return value;
  }
  return "all";
}

export type UnifiedDocumentListItem = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  scope: "firm" | "candidate";
  categories?: Array<{ id: string; name: string }>;
  candidateId?: string;
  candidateName?: string;
  candidateCategory?: string;
};
