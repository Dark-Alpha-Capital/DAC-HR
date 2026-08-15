import React from "react";
import { DebouncedTextFilter } from "#/components/shared/debounced-text-filter";

const FilterQuestionSearch = () => (
  <DebouncedTextFilter
    param="search"
    placeholder="Search questions..."
    ariaLabel="Filter questions by search"
  />
);

export default FilterQuestionSearch;
