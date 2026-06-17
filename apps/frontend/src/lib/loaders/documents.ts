import { createServerFn } from "@tanstack/react-start";
import {
  getDocumentCategories,
  getDocuments,
} from "@workspace/db/repositories/document-repository";

type DocumentsIndexInput = {
  category?: string[];
  name?: string;
  tags?: string;
  page?: number;
};

export const loadDocumentsIndex = createServerFn({ method: "GET" })
  .validator((data: DocumentsIndexInput) => data)
  .handler(async ({ data: deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [categories, documentsResult] = await Promise.all([
      getDocumentCategories(),
      getDocuments(deps.category, deps.name, deps.tags, currentPage, limit),
    ]);

    const { documents, total } = documentsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      categories,
      documents,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(deps.category?.length || deps.name || deps.tags),
    };
  });
