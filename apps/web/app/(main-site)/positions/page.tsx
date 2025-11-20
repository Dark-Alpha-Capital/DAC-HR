import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getPositions } from "@workspace/db/queries";
import PositionCard from "@/components/position-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Positions",
  description: "Positions list",
};

const page = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Positions</h1>
        <Button asChild>
          <Link href="/positions/new">New Position</Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <PositionsList />
      </Suspense>
    </div>
  );
};

export default page;

const PositionsList = async () => {
  const positions = await getPositions();

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {positions.map((position) => (
        <PositionCard
          key={position.id}
          positionId={position.id}
          positionName={position.name}
          positionDescription={position.description || ""}
          positionSlug={position.slug}
        />
      ))}
    </div>
  );
};
