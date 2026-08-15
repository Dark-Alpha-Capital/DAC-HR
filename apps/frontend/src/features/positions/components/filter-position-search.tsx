import React from "react";
import { DebouncedTextFilter } from "#/components/shared/debounced-text-filter";

const FilterPositionSearch = () => (
  <DebouncedTextFilter
    param="search"
    placeholder="Search positions..."
    ariaLabel="Filter positions by search"
    className="min-w-[200px]"
  />
);

export default FilterPositionSearch;
