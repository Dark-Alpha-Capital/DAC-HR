import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft } from "lucide-react";
import DocumentUploadForm from "@/components/forms/document-upload-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { getDocumentCategories } from "@workspace/db/repositories/document-repository";

export const Route = createFileRoute("/_main/documents/new")({
  head: () => ({
    meta: [{ title: "New Document" }],
  }),
  loader: async () => {
    const categories = await getDocumentCategories();
    return { categories };
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
