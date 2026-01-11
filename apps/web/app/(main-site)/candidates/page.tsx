import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { Suspense } from "react";
import {
  getCandidatesWithPositionsFiltered,
  getPositions,
} from "@workspace/db/queries";
import CandidateFilters from "@/components/candidate-filters";
import CandidateContainer from "./candidate-container";
import { CandidatesListSkeleton } from "@/components/skeletons/candidates-list-skeleton";
import type { Metadata } from "next";
import { UserAuthenticated } from "@/components/auth-checks";
import CandidatesPaginationControls from "@/components/candidates-pagination-controls";
import { cacheLife, cacheTag } from "next/cache";
import BulkUploadCandidatesDialog from "@/components/bulk-upload-candidates-dialog";

export const metadata: Metadata = {
  title: "Candidates",
  description: "Candidates list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="space-y-6">
      <Suspense>
        <UserAuthenticated />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <div className="flex items-center gap-2">
          <BulkUploadCandidatesDialog />
          <Button asChild>
            <Link href="/candidates/new">New Candidate</Link>
          </Button>
        </div>
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

  const { positions } = await getPositions();
  const positionTypes = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return <CandidateFilters positions={positionTypes} />;
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
    limit,
  );

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
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
      <CandidateContainer
        candidates={candidates}
        currentPage={currentPage}
        limit={limit}
      />
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
