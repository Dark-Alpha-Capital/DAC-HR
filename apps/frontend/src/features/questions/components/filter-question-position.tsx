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

const FilterQuestionPosition = ({
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
      resetListPageParam(params);
      params.delete("position");

      const newSelected = checked
        ? [...selectedPositions, value]
        : selectedPositions.filter((pos) => pos !== value);

      newSelected.forEach((pos) => params.append("position", pos));
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
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {selectedPositions.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Position</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!positions || positions.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No positions available
            </div>
          ) : (
            positions.map((position) => (
              <DropdownMenuCheckboxItem
                key={position.id}
                checked={selectedPositions.includes(position.id)}
                onCheckedChange={(checked) =>
                  handleCheckedChange(position.id, checked as boolean)
                }
              >
                {position.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterQuestionPosition;
