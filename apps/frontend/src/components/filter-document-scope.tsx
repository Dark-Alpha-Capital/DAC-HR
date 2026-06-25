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
import {
  documentScopeLabels,
  documentScopeOptions,
  parseDocumentScope,
} from "@workspace/db/document-list-filters";

const FilterDocumentScope = () => {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentScope = parseDocumentScope(searchParams.get("scope") ?? undefined);
  const [selectedScope, setSelectedScope] = useOptimistic(currentScope);

  const handleScopeChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value === "all") {
        params.delete("scope");
        params.delete("candidateId");
      } else {
        params.set("scope", value);
      }
      resetListPageParam(params);
      setSelectedScope(parseDocumentScope(value));
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
            Type
            {selectedScope !== "all" ? (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {documentScopeLabels[selectedScope]}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {documentScopeOptions.map((scope) => (
            <DropdownMenuCheckboxItem
              key={scope}
              checked={selectedScope === scope}
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
