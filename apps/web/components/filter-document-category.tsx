import { useUrlSearchParams } from "@/lib/hooks/use-url-search-params";

import React, { useOptimistic, useTransition } from "react";
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
import type { DocumentCategory } from "@workspace/db/schema";

const FilterDocumentCategory = ({
  categories,
}: {
  categories: DocumentCategory[];
}) => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedCategories, setSelectedCategories] = useOptimistic(
    searchParams.getAll("category"),
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
          {categories.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No categories available
            </div>
          ) : (
            categories.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat.id}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={(checked) =>
                  handleCheckedChange(cat.id, checked as boolean)
                }
              >
                {cat.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterDocumentCategory;
