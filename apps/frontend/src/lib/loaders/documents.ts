import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
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
