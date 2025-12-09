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

const hireLevelOptions = [
  { value: "managing-director", label: "Managing Director" },
  { value: "vice-president", label: "Vice President" },
  { value: "associate-analyst", label: "Associate Analyst" },
  { value: "intern", label: "Intern" },
];

const FilterPositionHireLevel = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedLevels, setSelectedLevels] = useOptimistic(
    searchParams.getAll("hireLevel")
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("hireLevel");

      const newSelected = checked
        ? [...selectedLevels, value]
        : selectedLevels.filter((level) => level !== value);

      newSelected.forEach((level) => params.append("hireLevel", level));
      setSelectedLevels(newSelected);

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
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Hire Level
            {selectedLevels.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedLevels.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Hire Level</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hireLevelOptions.map((level) => (
            <DropdownMenuCheckboxItem
              key={level.value}
              checked={selectedLevels.includes(level.value)}
              onCheckedChange={(checked) =>
                handleCheckedChange(level.value, checked as boolean)
              }
            >
              {level.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterPositionHireLevel;

