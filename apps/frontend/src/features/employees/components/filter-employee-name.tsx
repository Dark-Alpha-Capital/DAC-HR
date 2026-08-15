import React from "react";
import { DebouncedTextFilter } from "#/components/shared/debounced-text-filter";

const FilterEmployeeName = () => (
  <DebouncedTextFilter
    param="name"
    placeholder="Search by name..."
    ariaLabel="Filter employees by name"
  />
);

export default FilterEmployeeName;
