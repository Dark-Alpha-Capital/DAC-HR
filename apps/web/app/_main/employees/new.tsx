import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import EmployeeUploadForm from "@/components/forms/employee-upload-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import {
  getCandidateWithApplications,
  getPositions,
} from "@workspace/db/queries";

export const Route = createFileRoute("/_main/employees/new")({
  head: () => ({
    meta: [{ title: "New Employee" }],
  }),
  loader: async ({ location }) => {
    const query = location.href.includes("?")
      ? location.href.split("?")[1]?.split("#")[0] ?? ""
      : "";
    const params = new URLSearchParams(query);
    const candidateId = params.get("candidateId") ?? undefined;
    const applicationId = params.get("applicationId") ?? undefined;

    const { positions } = await getPositions();
    const cleanedPositions = positions.map((position) => ({
      id: position.id,
      name: position.name,
    }));

    let candidateData = null;
    let applicationData = null;

    if (candidateId) {
      candidateData = await getCandidateWithApplications(candidateId);
      if (candidateData && applicationId) {
        applicationData =
          candidateData.applications.find((app) => app.id === applicationId) ??
          null;
      }
    }

    return {
      positions: cleanedPositions,
      candidateId,
      candidateData,
      applicationData,
    };
  },
  component: NewEmployeePage,
});

function NewEmployeePage() {
  const { positions, candidateId, candidateData, applicationData } =
    Route.useLoaderData();

  return (
    <div className="narrow-container mx-auto space-y-8 py-6">
      <Button asChild variant="secondary" size="sm">
        <Link to="/employees" search="{}">Back to Employees</Link>
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
