import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString, toPageNumber, toStringArray } from "#/lib/parse-search";
import { loadDocumentsIndex } from "./server/queries/documents";

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toOptionalString / toStringArray / toPageNumber.
interface DocumentsSearchInput {
  scope?: unknown;
  category?: unknown;
  name?: unknown;
  candidateId?: unknown;
  page?: unknown;
}

export function parseDocumentsSearch(search: DocumentsSearchInput) {
  return {
    scope: toOptionalString(search.scope),
    // SAFETY: search values come from URLSearchParams, which are always
    // strings or arrays of strings.
    category: toStringArray(search.category as string | string[] | undefined),
    name: toOptionalString(search.name),
    candidateId: toOptionalString(search.candidateId),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : undefined,
  };
}

export type DocumentsIndexSearch = ReturnType<typeof parseDocumentsSearch>;
export type DocumentsIndexData = Awaited<ReturnType<typeof loadDocumentsIndex>>;

export function documentsIndexQueryOptions(deps: DocumentsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.documents.list(deps),
    queryFn: async (): Promise<DocumentsIndexData> =>
      loadDocumentsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
