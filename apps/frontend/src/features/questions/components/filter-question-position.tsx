import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";

const FilterQuestionPosition = ({
  positions,
}: {
  positions: {
    id: string;
    name: string;
  }[];
}) => (
  <MultiSelectFilter
    param="position"
    label="Position"
    filterLabel="Filter by Position"
    options={positions.map((position) => ({
      value: position.id,
      label: position.name,
    }))}
    emptyText="No positions available"
  />
);

export default FilterQuestionPosition;
