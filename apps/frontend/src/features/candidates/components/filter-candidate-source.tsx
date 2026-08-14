import { useUrlSearchParams } from "#/lib/hooks/use-url-search-params";

import React, { useOptimistic, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Button } from "#/components/ui/button";
import { Filter } from "lucide-react";
import { candidateSourceOptions } from "@workspace/db/candidate-list-filters";

const FilterCandidateSource = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedSources, setSelectedSources] = useOptimistic(
    searchParams.getAll("source"),
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("source");

      const newSelected = checked
        ? [...selectedSources, value]
        : selectedSources.filter((source) => source !== value);

      newSelected.forEach((source) => params.append("source", source));
      setSelectedSources(newSelected);
      params.delete("page");
      setSearchParams(params);
    });
  };

  return (
    <div
      className="flex items-center gap-2"
      data-pending={isPending ? "" : undefined}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Source
            {selectedSources.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedSources.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {candidateSourceOptions.map((source) => (
            <DropdownMenuCheckboxItem
              key={source}
              checked={selectedSources.includes(source)}
              onCheckedChange={(checked) =>
                handleCheckedChange(source, checked as boolean)
              }
            >
              {source}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterCandidateSource;
