import EmployeeUploadForm from "@/components/forms/employee-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions, getCandidateWithApplications } from "@workspace/db/queries";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  return (
    <div className="block-space-mini narrow-container mx-auto">
      <Button>
        <Link href="/employees">Back to Employees</Link>
      </Button>

      <div className="mt-4 md:mt-6 lg:mt-8">
        <Suspense fallback={<FormLoadingFallback />}>
          <DisplayEmployeeUploadForm searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
};

export default page;

async function DisplayEmployeeUploadForm({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const candidateId = typeof params.candidateId === "string" ? params.candidateId : undefined;
  const applicationId = typeof params.applicationId === "string" ? params.applicationId : undefined;

  const positions = await getPositions();
  const cleanedPositions = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  // Fetch candidate data if candidateId is provided
  let candidateData = null;
  let applicationData = null;
  if (candidateId) {
    candidateData = await getCandidateWithApplications(candidateId);
    if (candidateData && applicationId) {
      applicationData = candidateData.applications.find(
        (app) => app.id === applicationId
      );
    }
  }

  return (
    <EmployeeUploadForm
      positions={cleanedPositions}
      candidateId={candidateId}
      candidateData={candidateData}
      applicationData={applicationData}
    />
  );
}
