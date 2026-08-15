import { Suspense } from "react";
import { Link, useLoaderData, useParams } from "@tanstack/react-router";
import BackButton from "#/components/shared/back-button";
import CandidateDocumentEditForm from "#/features/candidates/components/candidate-document-edit-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";

export function CandidateDocumentEditPage() {
  const { document } = useLoaderData({
    from: "/_main/candidates/$uid/documents/$documentId/edit",
  });
  const { uid } = useParams({
    from: "/_main/candidates/$uid/documents/$documentId/edit",
  });

  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
      <Suspense fallback={<FormLoadingFallback />}>
        {!document ? (
          <Card>
            <CardHeader>
              <CardTitle>Document not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The document you&apos;re looking for doesn&apos;t exist or has
                been removed.
              </p>
            </CardContent>
            <CardContent>
              <Button asChild>
                <Link to="/candidates/$uid" search={{}} params={{ uid }}>
                  Back to Candidate
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CandidateDocumentEditForm />
        )}
      </Suspense>
    </div>
  );
}
