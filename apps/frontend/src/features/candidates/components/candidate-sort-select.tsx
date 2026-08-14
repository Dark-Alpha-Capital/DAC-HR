import { useUrlSearchParams } from "#/lib/hooks/use-url-search-params";

import React, { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  candidateSortLabels,
  candidateSortOptions,
  parseCandidateSortOption,
} from "@workspace/db/candidate-list-filters";
import { ArrowUpDown } from "lucide-react";

const CandidateSortSelect = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentSort = parseCandidateSortOption(
    searchParams.get("sort") ?? undefined,
  );

  const handleSortChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value === "newest") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
      params.delete("page");
      setSearchParams(params);
    });
  };

  return (
    <div data-pending={isPending ? "" : undefined}>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger size="sm" className="w-[180px]" aria-label="Sort candidates">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {candidateSortOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {candidateSortLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CandidateSortSelect;
