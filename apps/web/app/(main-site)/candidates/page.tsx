import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import {
  getCandidatesWithPositionsFiltered,
  getPositions,
} from "@workspace/db/queries";
import FilterCandidateName from "@/components/filter-candidate-name";
import FilterCandidateEmail from "@/components/filter-candidate-email";
import FilterCandidatePosition from "@/components/filter-candidate-position";
import ClearCandidateFiltersButton from "@/components/clear-candidate-filters-button";
import CandidateContainer from "./candidate-container";
import { CandidatesListSkeleton } from "@/components/skeletons/candidates-list-skeleton";
import { Metadata } from "next";
import { UserAuthenticated } from "@/components/auth-checks";
import CandidatesPaginationControls from "@/components/candidates-pagination-controls";
import { cacheLife, cacheTag } from "next/cache";

export const metadata: Metadata = {
  title: "Candidates",
  description: "Candidates list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Candidates</h1>
        <Button asChild>
          <Link href="/candidates/new">New Candidate</Link>
        </Button>
      </div>

      <Suspense>
        <PresentFilters />
      </Suspense>

      <Suspense fallback={<CandidatesListSkeleton />}>
        <CandidatesListWrapper searchParams={searchParams} />
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
      <ClearCandidateFiltersButton />
    </div>
  );
}

const PresentFilters = CachedPresentFilters;

// Component (not cached) reads runtime data
const CandidatesListWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const { name, email, position, page: pageParam } = await searchParams;

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

  // Extract position IDs from the position parameter
  const positionIds = position
    ? Array.isArray(position)
      ? position
      : [position]
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
    <CachedCandidatesList
      nameSearch={nameSearch}
      emailSearch={emailSearch}
      positionIds={positionIds}
      currentPage={currentPage}
    />
  );
};

// Cached component receives data as props
async function CachedCandidatesList({
  nameSearch,
  emailSearch,
  positionIds,
  currentPage,
}: {
  nameSearch?: string;
  emailSearch?: string;
  positionIds?: string[];
  currentPage: number;
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");

  const limit = 50;

  const { candidates, total } = await getCandidatesWithPositionsFiltered(
    nameSearch,
    emailSearch,
    positionIds,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {nameSearch || emailSearch || positionIds
            ? "No candidates found matching the selected filters."
            : "No candidates found."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/candidates/new">Add your first candidate</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CandidateContainer candidates={candidates} />
      {totalPages > 1 && (
        <CandidatesPaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      )}
    </div>
  );
}
