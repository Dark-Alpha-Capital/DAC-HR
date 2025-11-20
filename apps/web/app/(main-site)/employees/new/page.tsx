import EmployeeUploadForm from "@/components/forms/employee-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions } from "@workspace/db/queries";

const page = async () => {
  return (
    <div className="block-space narrow-container mx-auto">
      <Button>
        <Link href="/employees">Back to Employees</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayEmployeeUploadForm />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayEmployeeUploadForm() {
  const positions = await getPositions();
  const cleanedPositions = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));
  return <EmployeeUploadForm positions={cleanedPositions} />;
}

