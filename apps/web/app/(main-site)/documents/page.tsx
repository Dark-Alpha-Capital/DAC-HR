import React, { Suspense } from "react";
import { Metadata } from "next";
import { getDocuments } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import DocumentCard from "@/components/document-card";

export const metadata: Metadata = {
  title: "Documents",
  description: "Documents list",
};

const DocumentsPage = () => {
  return (
    <div className="block-space narrow-container mx-auto">
      <div className="flex items-center justify-between mb-6">
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
        <p className="text-muted-foreground text-lg">
          No documents found. Create your first document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </div>
  );
}
