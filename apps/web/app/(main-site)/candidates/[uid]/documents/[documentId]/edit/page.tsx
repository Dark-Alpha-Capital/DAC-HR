import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import React, { Suspense } from "react";
import BackButton from "@/components/back-button";
import CandidateDocumentEditForm from "@/components/forms/candidate-document-edit-form";
import { getDocumentsByCandidateId } from "@workspace/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

type Params = Promise<{ uid: string; documentId: string }>;

const EditCandidateDocumentPage = async ({ params }: { params: Params }) => {
  return (
    <div className="block-space narrow-container mx-auto">
      <BackButton />
      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayEditForm params={params} />
      </Suspense>
    </div>
  );
};

export default EditCandidateDocumentPage;

const DisplayEditForm = async ({ params }: { params: Params }) => {
  const { uid, documentId } = await params;
  const documents = await getDocumentsByCandidateId(uid);
  const document = documents.find((doc) => doc.id === documentId);

  if (!document) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The document you're looking for doesn't exist or has been removed.
          </p>
        </CardContent>
        <CardContent>
          <Button asChild>
            <Link href={`/candidates/${uid}`}>Back to Candidate</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <CandidateDocumentEditForm />
    </div>
  );
};
