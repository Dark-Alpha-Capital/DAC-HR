import DocumentUploadForm from "@/components/forms/document-upload-form";
import React, { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Document",
  description: "Create a new document",
};

const page = () => {
  return (
    <div className="block-space-mini narrow-container mx-auto">
      <div>
        <Link href="/documents">Back to Documents</Link>
      </div>

      <div className="mt-4 md:mt-6 lg:mt-8">
        <Suspense>
          <DocumentUploadForm />
        </Suspense>
      </div>
    </div>
  );
};

export default page;
