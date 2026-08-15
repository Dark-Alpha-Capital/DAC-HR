import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";
import { candidateSourceOptions } from "#/features/candidates/constants";

const FilterCandidateSource = () => (
  <MultiSelectFilter
    param="source"
    label="Source"
    filterLabel="Filter by Source"
    options={candidateSourceOptions.map((source) => ({
      value: source,
      label: source,
    }))}
  />
);

export default FilterCandidateSource;
