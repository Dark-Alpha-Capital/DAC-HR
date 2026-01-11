import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getPositions } from "@workspace/db/queries";
import PositionContainer from "./position-container";
import { Metadata } from "next";
import { UserIsAdmin } from "@/components/auth-checks";
import FilterPositionHireLevel from "@/components/filter-position-hire-level";
import FilterPositionStatus from "@/components/filter-position-status";
import ClearPositionFiltersButton from "@/components/clear-position-filters-button";
import { cacheLife, cacheTag } from "next/cache";
import PaginationControls from "@/components/pagination-controls";

export const metadata: Metadata = {
  title: "Positions",
  description: "Positions list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Positions</h1>
        <Button asChild>
          <Link href="/positions/new">New Position</Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <PresentFilters />
      </Suspense>

      <Suspense fallback={<div>Loading...</div>}>
        <PositionsListWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

const PresentFilters = async () => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPositionHireLevel />
      <FilterPositionStatus />
      <ClearPositionFiltersButton />
    </div>
  );
};

// Component (not cached) reads runtime data
const PositionsListWrapper = async ({
  searchParams,
}: {
  searchParams: SearchParams;
}) => {
  const params = await searchParams;
  const hireLevels = params.hireLevel
    ? Array.isArray(params.hireLevel)
      ? params.hireLevel
      : [params.hireLevel]
    : undefined;
  const statuses = params.status
    ? Array.isArray(params.status)
      ? params.status
      : [params.status]
    : undefined;

  // Extract page number (default to 1)
  const page = params.page
    ? typeof params.page === "string"
      ? parseInt(params.page, 10)
      : Array.isArray(params.page) && params.page[0]
        ? parseInt(params.page[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;

  return (
    <CachedPositionsList
      hireLevels={hireLevels}
      statuses={statuses}
      currentPage={currentPage}
    />
  );
};

// Cached component receives data as props
async function CachedPositionsList({
  hireLevels,
  statuses,
  currentPage,
}: {
  hireLevels?: string[];
  statuses?: string[];
  currentPage: number;
}) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("positions");

  const limit = 50;

  const { positions, total } = await getPositions(
    hireLevels,
    statuses,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No positions found.</p>
        <Button asChild className="mt-4">
          <Link href="/positions/new">Create your first position</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PositionContainer positions={positions} />
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          basePath="/positions"
        />
      )}
    </div>
  );
}
