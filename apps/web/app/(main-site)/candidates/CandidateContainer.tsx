import React from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import type { CandidateWithPosition } from "@/lib/types";
import type { Candidate } from "./columns";

// Define job sources mapping
const jobSources = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "monster", label: "Monster" },
  { value: "ziprecruiter", label: "ZipRecruiter" },
  { value: "company_website", label: "Company Website" },
];

// Helper function to get label from value
const getSourceLabel = (value: string | null | undefined) => {
  return jobSources.find((source) => source.value === value)?.label || "";
};

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
    source: getSourceLabel(candidate.source),
  }));

  return (
    <div>
      <DataTable columns={columns} data={transformedCandidates} />
    </div>
  );
};

export default CandidateContainer;
