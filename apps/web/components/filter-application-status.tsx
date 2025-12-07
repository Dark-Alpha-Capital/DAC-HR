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

const statuses = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interviewing", label: "Interviewing" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const FilterApplicationStatus = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStatuses, setSelectedStatuses] = useOptimistic(
    searchParams.getAll("status")
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("status");

      const newSelected = checked
        ? [...selectedStatuses, value]
        : selectedStatuses.filter((status) => status !== value);

      newSelected.forEach((status) => params.append("status", status));
      setSelectedStatuses(newSelected);

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
            Status
            {selectedStatuses.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedStatuses.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statuses.map((status) => (
            <DropdownMenuCheckboxItem
              key={status.value}
              checked={selectedStatuses.includes(status.value)}
              onCheckedChange={(checked) =>
                handleCheckedChange(status.value, checked as boolean)
              }
            >
              {status.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterApplicationStatus;















