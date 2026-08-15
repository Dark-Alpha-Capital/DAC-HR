import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";
import {
  applicationStatuses,
  applicationStatusLabels,
} from "#/lib/application-status";

const statuses = applicationStatuses.map((value) => ({
  value,
  label: applicationStatusLabels[value],
}));

const FilterApplicationStatus = ({
  label = "Status",
  filterLabel = "Filter by Status",
}: {
  label?: string;
  filterLabel?: string;
}) => (
  <MultiSelectFilter
    param="status"
    label={label}
    filterLabel={filterLabel}
    options={statuses}
  />
);

export default FilterApplicationStatus;
