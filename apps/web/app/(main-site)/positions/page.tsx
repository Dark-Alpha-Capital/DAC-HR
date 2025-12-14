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

// Cached function for positions
async function CachedPositions(hireLevels?: string[], statuses?: string[]) {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  return await getPositions(hireLevels, statuses);
}

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

  const positions = await CachedPositions(hireLevels, statuses);

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

  return <PositionContainer positions={positions} />;
};
