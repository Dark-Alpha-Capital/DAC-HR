import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getCandidatesWithPositions } from "@workspace/db/queries";
import CandidateContainer from "./CandidateContainer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Candidates",
  description: "Candidates list",
};

const page = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Candidates</h1>
        <Button asChild>
          <Link href="/candidates/new">New Candidate</Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <CandidatesList />
      </Suspense>
    </div>
  );
};

export default page;

const CandidatesList = async () => {
  const candidates = await getCandidatesWithPositions();

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No candidates found.</p>
        <Button asChild className="mt-4">
          <Link href="/candidates/new">Add your first candidate</Link>
        </Button>
      </div>
    );
  }

  return <CandidateContainer candidates={candidates} />;
};
