import DocumentUploadForm from "@/components/forms/document-upload-form";
import React, { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { UserAuthenticated } from "@/components/auth-checks";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "New Document",
  description: "Create a new document",
};

const page = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <div>
        <Button size="sm" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </Button>
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
