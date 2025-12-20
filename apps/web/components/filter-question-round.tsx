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

const FilterQuestionRound = ({
  rounds,
}: {
  rounds: {
    id: string;
    name: string;
  }[];
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRounds, setSelectedRounds] = useOptimistic(
    searchParams.getAll("round")
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("round");

      const newSelected = checked
        ? [...selectedRounds, value]
        : selectedRounds.filter((round) => round !== value);

      newSelected.forEach((round) => params.append("round", round));
      setSelectedRounds(newSelected);

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
            Round
            {selectedRounds.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {selectedRounds.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Round</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {rounds.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No rounds available
            </div>
          ) : (
            rounds.map((round) => (
              <DropdownMenuCheckboxItem
                key={round.id}
                checked={selectedRounds.includes(round.id)}
                onCheckedChange={(checked) =>
                  handleCheckedChange(round.id, checked as boolean)
                }
              >
                {round.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterQuestionRound;

