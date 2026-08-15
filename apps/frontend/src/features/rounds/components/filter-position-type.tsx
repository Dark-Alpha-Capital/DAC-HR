import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";

const FilterPositionType = ({
  positionTypes,
}: {
  positionTypes: {
    id: string;
    name: string;
  }[];
}) => (
  <MultiSelectFilter
    param="type"
    label="Position Type"
    filterLabel="Filter by Position"
    options={positionTypes.map((positionType) => ({
      value: positionType.id,
      label: positionType.name,
    }))}
  />
);

export default FilterPositionType;
