import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getPositions, getRoundsWithPositions } from "@workspace/db/queries";
import RoundCard from "@/components/round-card";
import FilterPositionType from "@/components/filter-position-type";
import ClearParamsButton from "@/components/clear-params-button";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rounds",
  description: "Rounds list",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const page = async ({ searchParams }: { searchParams: SearchParams }) => {
  return (
    <div className="container mx-auto py-8 space-y-6">
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
        <RoundsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
};

export default page;

const PresentPositionFilter = async () => {
  const positions = await getPositions();
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
};

const RoundsList = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { type } = await searchParams;

  // Extract position IDs from the type parameter
  // type can be a string (single ID) or string[] (array of IDs)
  const positionIds = type ? (Array.isArray(type) ? type : [type]) : undefined;

  const rounds = await getRoundsWithPositions(positionIds);

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
    <div className="grid group-has-data-pending:animate-pulse grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rounds.map((round) => (
        <RoundCard key={round.id} round={round} />
      ))}
    </div>
  );
};
