import React, { Suspense } from "react";
import { getApplicationsFiltered, getPositions } from "@workspace/db/queries";
import { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { ApplicationsListSkeleton } from "@/components/skeletons/applications-list-skeleton";
import { UserAuthenticated } from "@/components/auth-checks";
import ApplicationContainer from "./application-container";
import FilterCandidatePosition from "@/components/filter-candidate-position";
import FilterApplicationStatus from "@/components/filter-application-status";
import FilterCandidateName from "@/components/filter-candidate-name";
import FilterCandidateEmail from "@/components/filter-candidate-email";
import ClearApplicationFiltersButton from "@/components/clear-application-filters-button";
import ApplicationsPaginationControls from "@/components/applications-pagination-controls";
import { cacheLife, cacheTag } from "next/cache";

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
        <ApplicationsListWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

async function CachedPresentFilters() {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  const positions = await getPositions();
  const positionTypes = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterCandidateName />
      <FilterCandidateEmail />
      <FilterCandidatePosition positions={positionTypes} />
      <FilterApplicationStatus />
      <ClearApplicationFiltersButton />
    </div>
  );
}

const PresentFilters = CachedPresentFilters;

// Component (not cached) reads runtime data
const ApplicationsListWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const { name, email, position, status, page: pageParam } = await searchParams;

  // Extract search terms
  const nameSearch = name
    ? typeof name === "string"
      ? name
      : name[0]
    : undefined;
  const emailSearch = email
    ? typeof email === "string"
      ? email
      : email[0]
    : undefined;

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

  // Extract page number (default to 1)
  const page = pageParam
    ? typeof pageParam === "string"
      ? parseInt(pageParam, 10)
      : Array.isArray(pageParam) && pageParam[0]
        ? parseInt(pageParam[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  return (
    <CachedApplicationsList
      nameSearch={nameSearch}
      emailSearch={emailSearch}
      positionIds={positionIds}
      statuses={statuses}
      currentPage={currentPage}
    />
  );
};

// Cached component receives data as props
async function CachedApplicationsList({
  nameSearch,
  emailSearch,
  positionIds,
  statuses,
  currentPage,
}: {
  nameSearch?: string;
  emailSearch?: string;
  positionIds?: string[];
  statuses?: string[];
  currentPage: number;
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("applications");

  const limit = 50;

  const { applications, total } = await getApplicationsFiltered(
    nameSearch,
    emailSearch,
    positionIds,
    statuses,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md">
        <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-1">No applications found.</p>
        <p className="text-sm text-muted-foreground">
          {nameSearch || emailSearch || positionIds || statuses
            ? "Try adjusting or clearing the filters to see more applications."
            : "Applications will appear here when candidates apply for positions."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ApplicationContainer
        applications={applications}
        currentPage={currentPage}
        limit={limit}
      />
      {totalPages > 1 && (
        <ApplicationsPaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      )}
    </div>
  );
}
