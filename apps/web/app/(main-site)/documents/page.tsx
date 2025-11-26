import React, { Suspense } from "react";
import { Metadata } from "next";
import { getDocuments } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import DocumentContainer from "./document-container";

export const metadata: Metadata = {
  title: "Documents",
  description: "Documents list",
};

const DocumentsPage = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Button asChild>
          <Link href="/documents/new">New Document</Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <PresentDocuments />
      </Suspense>
    </div>
  );
};

export default DocumentsPage;

async function PresentDocuments() {
  const documents = await getDocuments();

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No documents found. Create your first document to get started.
        </p>
        <Button asChild className="mt-4">
          <Link href="/documents/new">Add your first document</Link>
        </Button>
      </div>
    );
  }

  return <DocumentContainer documents={documents} />;
}
