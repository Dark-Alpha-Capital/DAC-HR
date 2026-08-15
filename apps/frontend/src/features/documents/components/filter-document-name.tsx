import React from "react";
import { DebouncedTextFilter } from "#/components/shared/debounced-text-filter";

const FilterDocumentName = () => (
  <DebouncedTextFilter
    param="name"
    placeholder="Search by name..."
    ariaLabel="Filter documents by name"
  />
);

export default FilterDocumentName;
