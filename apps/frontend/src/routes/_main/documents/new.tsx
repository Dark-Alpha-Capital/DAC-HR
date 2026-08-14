import { createFileRoute } from "@tanstack/react-router";
import { FormPageSkeleton } from "#/components/shared/form-page-skeleton";
import { DocumentNewPage } from "#/features/documents/components/document-new-page";
import { getAllCategories } from "#/features/documents/server/mutations/document-category-actions";

export const Route = createFileRoute("/_main/documents/new")({
  head: () => ({
    meta: [{ title: "New Document" }],
  }),
  loader: async () => {
    const categoriesResult = await getAllCategories();
    if (!categoriesResult.success) {
      throw new Error(categoriesResult.error ?? "Failed to fetch categories");
    }
    return { categories: categoriesResult.data };
  },
  component: DocumentNewPage,
  pendingComponent: () => <FormPageSkeleton fieldCount={5} />,
});
