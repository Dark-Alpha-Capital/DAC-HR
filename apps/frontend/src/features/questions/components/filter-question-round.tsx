import React from "react";
import { MultiSelectFilter } from "#/components/shared/multi-select-filter";

const FilterQuestionRound = ({
  rounds,
}: {
  rounds: {
    id: string;
    name: string;
  }[];
}) => (
  <MultiSelectFilter
    param="round"
    label="Round"
    filterLabel="Filter by Round"
    options={rounds.map((round) => ({ value: round.id, label: round.name }))}
    emptyText="No rounds available"
  />
);

export default FilterQuestionRound;
