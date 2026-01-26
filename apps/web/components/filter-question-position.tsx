"use client";

import React, { useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import { Filter } from "lucide-react";

const FilterQuestionPosition = ({
  positions,
}: {
  positions: {
    id: string;
    name: string;
  }[];
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
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
      setSelectedPositions(newSelected);

      router.push(`?${params.toString()}`, {
        scroll: false,
      });
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
          {positions.length === 0 ? (
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
