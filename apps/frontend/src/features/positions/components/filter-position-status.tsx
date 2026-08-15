import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "hold", label: "Hold" },
  { value: "passed", label: "Passed" },
  { value: "upcoming", label: "Upcoming" },
];

const FilterPositionStatus = () => (
  <MultiSelectFilter
    param="status"
    label="Status"
    filterLabel="Filter by Status"
    options={statusOptions}
  />
);

export default FilterPositionStatus;
