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

const categories = [
  { value: "job-description", label: "Job Description" },
  { value: "onboarding", label: "Onboarding" },
  { value: "policy", label: "Policy" },
  { value: "hr-form", label: "HR Form" },
  { value: "other", label: "Other" },
];

const FilterDocumentCategory = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCategories, setSelectedCategories] = useOptimistic(
    searchParams.getAll("category")
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("category");

      const newSelected = checked
        ? [...selectedCategories, value]
        : selectedCategories.filter((cat) => cat !== value);

      newSelected.forEach((cat) => params.append("category", cat));
      setSelectedCategories(newSelected);

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
            Category
            {selectedCategories.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedCategories.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categories.map((cat) => (
            <DropdownMenuCheckboxItem
              key={cat.value}
              checked={selectedCategories.includes(cat.value)}
              onCheckedChange={(checked) =>
                handleCheckedChange(cat.value, checked as boolean)
              }
            >
              {cat.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterDocumentCategory;
















