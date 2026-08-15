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
import { Badge } from "#/components/ui/badge";
import { Filter, X } from "lucide-react";
import { useMultiSelectFilter } from "#/lib/hooks/use-url-list-filter";
import { cn } from "#/lib/utils";

export type MultiSelectFilterOption = {
  value: string;
  label: string;
};

type MultiSelectFilterProps = {
  /** URL search-param name backing this filter. */
  param: string;
  /** Button label. */
  label: string;
  /** Dropdown header text. */
  filterLabel?: string;
  options: MultiSelectFilterOption[];
  /** Shown when there are no options (e.g. "No positions available"). */
  emptyText?: string;
  /** Hide the selected-count badge (default shows it). */
  showCount?: boolean;
  /** Render selected options as removable badges next to the button. */
  removableBadges?: boolean;
  /** Extra param mutations before committing (e.g. clearing a related param). */
  onMutate?: (params: URLSearchParams, next: string[], prev: string[]) => void;
};

export function MultiSelectFilter({
  param,
  label,
  filterLabel,
  options,
  emptyText,
  showCount = true,
  removableBadges = false,
  onMutate,
}: MultiSelectFilterProps) {
  const { selected, isPending, update, toggle } = useMultiSelectFilter(param, {
    onMutate,
  });

  const labelFor = (value: string) =>
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <div
      className={cn("flex items-center gap-2", removableBadges && "flex-wrap")}
      data-pending={isPending ? "" : undefined}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            {label}
            {showCount && selected.length > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selected.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {filterLabel && (
            <>
              <DropdownMenuLabel>{filterLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {options.length === 0 && emptyText ? (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              {emptyText}
            </div>
          ) : (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) => toggle(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {removableBadges &&
        selected.map((value) => (
          <Badge
            key={value}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            {labelFor(value)}
            <button
              type="button"
              aria-label={`Remove ${labelFor(value)} filter`}
              className="rounded-sm p-0.5 hover:bg-muted"
              onClick={() =>
                update(selected.filter((current) => current !== value))
              }
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
    </div>
  );
}
