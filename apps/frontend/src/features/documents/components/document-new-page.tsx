import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DocumentUploadForm from "#/features/documents/components/document-upload-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";

export function DocumentNewPage() {
  const { categories } = useLoaderData({ from: "/_main/documents/new" });

  return (
    <div className="narrow-container mx-auto space-y-8 py-6">
      <Button size="sm" asChild variant="secondary">
        <Link
          to="/documents"
          search={{
            scope: undefined,
            category: undefined,
            name: undefined,
            candidateId: undefined,
            page: undefined,
          }}
        >
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
