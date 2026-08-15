import React from "react";
import { DebouncedTextFilter } from "#/components/shared/debounced-text-filter";

const FilterCandidateName = () => (
  <DebouncedTextFilter
    param="name"
    placeholder="Search by name..."
    ariaLabel="Filter candidates by name"
  />
);

export default FilterCandidateName;
