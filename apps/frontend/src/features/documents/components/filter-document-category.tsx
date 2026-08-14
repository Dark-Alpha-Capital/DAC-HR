import { useUrlSearchParams } from "#/lib/hooks/use-url-search-params";
import { resetListPageParam } from "#/lib/parse-search";
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
import { Badge } from "#/components/ui/badge";
import { Filter, X } from "lucide-react";
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

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const updateCategories = (nextSelected: string[]) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("category");
      nextSelected.forEach((categoryId) => params.append("category", categoryId));
      resetListPageParam(params);
      setSelectedCategories(nextSelected);
      setSearchParams(params);
    });
  };

  const handleCheckedChange = (value: string, checked: boolean) => {
    const nextSelected = checked
      ? [...new Set([...selectedCategories, value])]
      : selectedCategories.filter((categoryId) => categoryId !== value);
    updateCategories(nextSelected);
  };

  const handleRemoveCategory = (value: string) => {
    updateCategories(selectedCategories.filter((categoryId) => categoryId !== value));
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-pending={isPending ? "" : undefined}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Category
            {selectedCategories.length > 0 ? (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedCategories.length}
              </span>
            ) : null}
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
            categories.map((category) => (
              <DropdownMenuCheckboxItem
                key={category.id}
                checked={selectedCategories.includes(category.id)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(checked) =>
                  handleCheckedChange(category.id, checked === true)
                }
              >
                {category.name}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedCategories.map((categoryId) => {
        const category = categoryById.get(categoryId);
        if (!category) {
          return null;
        }

        return (
          <Badge
            key={categoryId}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            {category.name}
            <button
              type="button"
              aria-label={`Remove ${category.name} filter`}
              className="rounded-sm p-0.5 hover:bg-muted"
              onClick={() => handleRemoveCategory(categoryId)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
};

export default FilterDocumentCategory;
