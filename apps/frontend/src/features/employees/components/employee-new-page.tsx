import { Suspense } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import EmployeeUploadForm from "#/features/employees/components/employee-upload-form";
import { FormLoadingFallback } from "#/components/shared/form-loading-skeleton";

export function EmployeeNewPage() {
  const { positions, candidateId, candidateData, applicationData } =
    useLoaderData({ from: "/_main/employees/new" });

  return (
    <div className="narrow-container mx-auto space-y-8 py-6">
      <Button asChild variant="secondary" size="sm">
        <Link to="/employees" search={{ memberType: "all", name: undefined }}>
          Back to Employees
        </Link>
      </Button>
      <Suspense fallback={<FormLoadingFallback />}>
        <EmployeeUploadForm
          positions={positions}
          candidateId={candidateId}
          candidateData={candidateData}
          applicationData={applicationData}
        />
      </Suspense>
    </div>
  );
}
