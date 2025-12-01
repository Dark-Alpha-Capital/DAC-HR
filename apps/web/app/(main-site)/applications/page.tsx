import React, { Suspense } from "react";
import { getAllApplications, getPositions } from "@workspace/db/queries";
import { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { ApplicationsListSkeleton } from "@/components/skeletons/applications-list-skeleton";
import { UserAuthenticated } from "@/components/auth-checks";
import ApplicationContainer from "./application-container";
import FilterCandidatePosition from "@/components/filter-candidate-position";
import FilterApplicationStatus from "@/components/filter-application-status";
import ClearApplicationFiltersButton from "@/components/clear-application-filters-button";

export const metadata: Metadata = {
  title: "Applications",
  description: "All job applications",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <h1 className="text-3xl font-bold">Applications</h1>

      <Suspense>
        <PresentFilters />
      </Suspense>

      <Suspense fallback={<ApplicationsListSkeleton />}>
        <ApplicationsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

const PresentFilters = async () => {
  const positions = await getPositions();
  const positionTypes = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterCandidatePosition positions={positionTypes} />
      <FilterApplicationStatus />
      <ClearApplicationFiltersButton />
    </div>
  );
};

const ApplicationsList = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const { position, status } = await searchParams;

  const positionIds = position
    ? Array.isArray(position)
      ? position
      : [position]
    : undefined;

  const statuses = status
    ? Array.isArray(status)
      ? status
      : [status]
    : undefined;

  const applications = await getAllApplications();

  const filteredApplications = applications.filter((application) => {
    const matchesPosition =
      !positionIds || positionIds.includes(application.position.id);

    const matchesStatus =
      !statuses || statuses.includes(application.status as string);

    return matchesPosition && matchesStatus;
  });

  if (filteredApplications.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md">
        <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-1">No applications found.</p>
        <p className="text-sm text-muted-foreground">
          {positionIds || statuses
            ? "Try adjusting or clearing the filters to see more applications."
            : "Applications will appear here when candidates apply for positions."}
        </p>
      </div>
    );
  }

  return <ApplicationContainer applications={filteredApplications} />;
};
