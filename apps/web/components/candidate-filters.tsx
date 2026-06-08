import React from "react";
import FilterCandidateName from "@/components/filter-candidate-name";
import FilterCandidateEmail from "@/components/filter-candidate-email";
import FilterCandidatePosition from "@/components/filter-candidate-position";
import ClearCandidateFiltersButton from "@/components/clear-candidate-filters-button";

interface CandidateFiltersProps {
  positions: {
    id: string;
    name: string;
  }[];
}

const CandidateFilters = ({ positions }: CandidateFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterCandidateName />
      <FilterCandidateEmail />
      <FilterCandidatePosition positions={positions} />
      <ClearCandidateFiltersButton />
    </div>
  );
};

export default CandidateFilters;
