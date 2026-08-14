import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  parseDocumentScope,
  type DocumentScope,
} from "@workspace/db/document-list-filters";
import {
  getDocumentCategories,
  getUnifiedDocuments,
} from "@workspace/db/repositories/document-repository";

type DocumentsIndexInput = {
  scope?: string;
  category?: string[];
  name?: string;
  tags?: string;
  candidateId?: string;
  page?: number;
};

export const loadDocumentsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: DocumentsIndexInput) => data)
  .handler(async ({ data: deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const scope: DocumentScope = parseDocumentScope(deps.scope);

    const [categories, documentsResult] = await Promise.all([
      getDocumentCategories(),
      getUnifiedDocuments(
        scope,
        deps.category,
        deps.name,
        deps.tags,
        deps.candidateId,
        currentPage,
        limit,
      ),
    ]);

    const { documents, total } = documentsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      scope,
      categories,
      documents,
      currentPage,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        scope !== "all" ||
          deps.category?.length ||
          deps.name ||
          deps.candidateId,
      ),
    };
  });

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString, toPageNumber, toStringArray } from "#/lib/parse-search";

export function parseDocumentsSearch(search: Record<string, unknown>) {
  return {
    scope: toOptionalString(search.scope),
    category: toStringArray(search.category as string | string[] | undefined),
    name: toOptionalString(search.name),
    candidateId: toOptionalString(search.candidateId),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
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
