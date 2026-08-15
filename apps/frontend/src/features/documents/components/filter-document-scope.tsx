import React from "react";
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
import {
  documentScopeLabels,
  documentScopeOptions,
  type DocumentScope,
} from "@workspace/db/document-list-filters";
import { useMultiSelectFilter } from "#/lib/hooks/use-url-list-filter";
import { cn } from "#/lib/utils";

const FilterDocumentScope = () => {
  const { selected, isPending, update } = useMultiSelectFilter("scope", {
    onMutate: (params, next) => {
      params.delete("candidateId");
      if (next.length === 0 || next.includes("all")) {
        params.delete("scope");
      }
    },
  });

  // "all" is the cleared state; the options show the actual scopes.
  const currentScope: DocumentScope =
    selected.length === 0 || selected.includes("all")
      ? "all"
      : (selected[0] as DocumentScope) ?? "all";

  const handleScopeChange = (value: string) => {
    update(value === "all" ? ["all"] : [value]);
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
            Type
            {currentScope !== "all" && (
              <span
                className={cn(
                  "ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground",
                )}
              >
                {documentScopeLabels[currentScope]}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {documentScopeOptions.map((scope) => (
            <DropdownMenuCheckboxItem
              key={scope}
              checked={currentScope === scope}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleScopeChange(scope);
                }
              }}
            >
              {documentScopeLabels[scope]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FilterDocumentScope;
