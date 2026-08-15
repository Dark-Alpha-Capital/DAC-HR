import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";

const hireLevelOptions = [
  { value: "managing-director", label: "Managing Director" },
  { value: "vice-president", label: "Vice President" },
  { value: "associate", label: "Associate" },
  { value: "analyst", label: "Analyst" },
  { value: "intern", label: "Intern" },
];

const FilterPositionHireLevel = () => (
  <MultiSelectFilter
    param="hireLevel"
    label="Hire Level"
    filterLabel="Filter by Hire Level"
    options={hireLevelOptions}
  />
);

export default FilterPositionHireLevel;
