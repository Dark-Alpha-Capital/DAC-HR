import { queryOptions } from "@tanstack/react-query";
import { loadDocumentsIndex } from "~/lib/loaders/documents";
import { queryKeys } from "~/lib/query/query-keys";

export type DocumentsIndexDeps = {
  scope?: string;
  category?: string[];
  name?: string;
  tags?: string;
  candidateId?: string;
  page?: number;
};

export function documentsIndexQueryOptions(deps: DocumentsIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.documents.list(deps),
    queryFn: () => loadDocumentsIndex({ data: deps }),
  });
}
