import DocumentUploadForm from "@/components/forms/document-upload-form";
import React, { Suspense } from "react";

const page = () => {
  return (
    <div className="block-space narrow-container mx-auto">
      <Suspense>
        <DocumentUploadForm />
      </Suspense>
    </div>
  );
};

export default page;
