import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DocumentUploadForm from "~/components/forms/document-upload-form";
import { FormLoadingFallback } from "~/components/skeletons/form-loading-skeleton";
import { getAllCategories } from "~/lib/actions/document-category-actions";

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
  component: NewDocumentPage,
});

function NewDocumentPage() {
  const { categories } = Route.useLoaderData();

  return (
    <div className="narrow-container mx-auto space-y-8 py-6">
      <Button size="sm" asChild variant="secondary">
        <Link to="/documents" search="{}">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Link>
      </Button>
      <Suspense fallback={<FormLoadingFallback />}>
        <DocumentUploadForm categories={categories} />
      </Suspense>
    </div>
  );
}
