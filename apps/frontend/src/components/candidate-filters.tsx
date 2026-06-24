import React from "react";
import FilterCandidateName from "~/components/filter-candidate-name";
import FilterCandidateEmail from "~/components/filter-candidate-email";
import FilterCandidatePosition from "~/components/filter-candidate-position";
import FilterApplicationStatus from "~/components/filter-application-status";
import FilterCandidateSource from "~/components/filter-candidate-source";
import CandidateSortSelect from "~/components/candidate-sort-select";
import ClearCandidateFiltersButton from "~/components/clear-candidate-filters-button";

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
      <FilterApplicationStatus
        label="Stage"
        filterLabel="Filter by Stage"
      />
      <FilterCandidateSource />
      <CandidateSortSelect />
      <ClearCandidateFiltersButton />
    </div>
  );
};

export default CandidateFilters;
