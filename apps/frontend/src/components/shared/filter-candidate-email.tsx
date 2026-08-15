import React from "react";
import { Mail } from "lucide-react";
import { DebouncedTextFilter } from "#/components/shared/debounced-text-filter";

const FilterCandidateEmail = () => (
  <DebouncedTextFilter
    param="email"
    type="email"
    placeholder="Search by email..."
    ariaLabel="Filter candidates by email"
    icon={<Mail className="h-4 w-4 text-muted-foreground" />}
  />
);

export default FilterCandidateEmail;
