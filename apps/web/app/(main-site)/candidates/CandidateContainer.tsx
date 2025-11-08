import React from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import type { CandidateWithPosition } from "@/lib/types";
import type { Candidate } from "./columns";

const CandidateContainer = ({
  candidates,
}: {
  candidates: CandidateWithPosition[];
}) => {
  // Transform candidates to match the Candidate type expected by columns
  const transformedCandidates: Candidate[] = candidates.map((candidate) => ({
    id: candidate.id,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    positionName: candidate.position?.name || "No Position",
    positionId: candidate.position?.id || "",
  }));

  return (
    <div>
      <DataTable columns={columns} data={transformedCandidates} />
    </div>
  );
};

export default CandidateContainer;
