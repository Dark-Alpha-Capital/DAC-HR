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

const FilterPositionType = ({
  positionTypes,
}: {
  positionTypes: {
    id: string;
    name: string;
  }[];
}) => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedTypes, setSelectedTypes] = useOptimistic(
    searchParams.getAll("type"),
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("type");

      const newSelected = checked
        ? [...selectedTypes, value]
        : selectedTypes.filter((type) => type !== value);

      newSelected.forEach((type) => params.append("type", type));
      setSelectedTypes(newSelected);

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
            Position Type
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Position</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {positionTypes.map((type) => (
            <DropdownMenuCheckboxItem
              key={type.id}
              checked={selectedTypes.includes(type.id)}
              onCheckedChange={(checked) =>
                handleCheckedChange(type.id, checked as boolean)
              }
            >
              {type.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterPositionType;
