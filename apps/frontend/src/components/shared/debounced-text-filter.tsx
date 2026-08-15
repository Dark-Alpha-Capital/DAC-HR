import React from "react";
import { Input } from "#/components/ui/input";
import { Search } from "lucide-react";
import { useDebouncedParam } from "#/lib/hooks/use-url-list-filter";
import { useUrlSearchParams } from "#/lib/hooks/use-url-search-params";
import { cn } from "#/lib/utils";

type DebouncedTextFilterProps = {
  /** URL search-param name backing this filter. */
  param: string;
  placeholder: string;
  ariaLabel: string;
  /** Input type (defaults to text; pass "email" for email fields). */
  type?: string;
  /** Extra classes on the wrapper (defaults to a max-w-sm flex-1 field). */
  className?: string;
  /** Optional input adornment (defaults to a Search icon). */
  icon?: React.ReactNode;
};

export function DebouncedTextFilter({
  param,
  placeholder,
  ariaLabel,
  type = "text",
  className,
  icon = <Search className="h-4 w-4 text-muted-foreground" />,
}: DebouncedTextFilterProps) {
  const { searchParams } = useUrlSearchParams();
  const { isPending, handleSearch } = useDebouncedParam(param);

  return (
    <div
      className={cn("relative flex-1 max-w-sm", className)}
      data-pending={isPending ? "" : undefined}
    >
      <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
        {icon}
      </span>
      <Input
        key={`${param}-${searchParams.get(param) ?? ""}`}
        type={type}
        placeholder={placeholder}
        defaultValue={searchParams.get(param) || ""}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9"
        aria-label={ariaLabel}
      />
    </div>
  );
}
