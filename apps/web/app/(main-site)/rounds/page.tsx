import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getPositions, getRoundsWithPositions } from "@workspace/db/queries";
import RoundContainer from "./round-container";
import FilterPositionType from "@/components/filter-position-type";
import ClearParamsButton from "@/components/clear-params-button";
import { Metadata } from "next";
import { UserIsAdmin } from "@/components/auth-checks";
import { cacheLife, cacheTag } from "next/cache";
import PaginationControls from "@/components/pagination-controls";

export const metadata: Metadata = {
  title: "Rounds",
  description: "Rounds list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rounds</h1>
        <Button asChild>
          <Link href="/rounds/new">New Round</Link>
        </Button>
      </div>

      <Suspense>
        <PresentPositionFilter />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        <RoundsListWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

async function CachedPresentPositionFilter() {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  const { positions } = await getPositions();
  const positionTypes = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return (
    <div className="flex items-center gap-2">
      <FilterPositionType positionTypes={positionTypes} />
      <ClearParamsButton />
    </div>
  );
}

const PresentPositionFilter = CachedPresentPositionFilter;

// Component (not cached) reads runtime data
const RoundsListWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams
}) => {
  const { type, page: pageParam } = await searchParams;

  // Extract position IDs from the type parameter
  // type can be a string (single ID) or string[] (array of IDs)
  const positionIds = type ? (Array.isArray(type) ? type : [type]) : undefined;

  // Extract page number (default to 1)
  const page = pageParam
    ? typeof pageParam === "string"
      ? parseInt(pageParam, 10)
      : Array.isArray(pageParam) && pageParam[0]
        ? parseInt(pageParam[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  return <CachedRoundsList positionIds={positionIds} currentPage={currentPage} />;
};

// Cached component receives data as props
async function CachedRoundsList({
  positionIds,
  currentPage,
}: {
  positionIds?: string[];
  currentPage: number;
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("rounds");

  const limit = 50;

  const { rounds, total } = await getRoundsWithPositions(
    positionIds,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (rounds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {positionIds && positionIds.length > 0
            ? "No rounds found for the selected position(s)."
            : "No rounds found."}
        </p>
        <Button asChild className="mt-4">
          <Link href="/rounds/new">Create your first round</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RoundContainer rounds={rounds} />
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          basePath="/rounds"
        />
      )}
    </div>
  );
}
