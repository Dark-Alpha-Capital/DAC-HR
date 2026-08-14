import { useUrlSearchParams } from "~/lib/hooks/use-url-search-params";

import { resetListPageParam } from "~/lib/parse-search";

import React, { useOptimistic, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Filter } from "lucide-react";

const FilterCandidatePosition = ({
  positions,
}: {
  positions: {
    id: string;
    name: string;
  }[];
}) => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedPositions, setSelectedPositions] = useOptimistic(
    searchParams.getAll("position"),
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("position");

      const newSelected = checked
        ? [...selectedPositions, value]
        : selectedPositions.filter((pos) => pos !== value);

      newSelected.forEach((pos) => params.append("position", pos));
      resetListPageParam(params);
      setSelectedPositions(newSelected);

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
            Position
            {selectedPositions.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedPositions.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Position</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {positions.map((pos) => (
            <DropdownMenuCheckboxItem
              key={pos.id}
              checked={selectedPositions.includes(pos.id)}
              onCheckedChange={(checked) =>
                handleCheckedChange(pos.id, checked as boolean)
              }
            >
              {pos.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterCandidatePosition;
