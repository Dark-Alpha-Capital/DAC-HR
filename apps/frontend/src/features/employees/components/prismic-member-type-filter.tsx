import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";
import type { PrismicMemberFilter } from "#/features/docs/query-options";

const options: { value: PrismicMemberFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "team", label: "Team Member" },
  { value: "operating", label: "Operating Member" },
];

type PrismicMemberTypeFilterProps = {
  current: PrismicMemberFilter;
  name?: string;
};

export function PrismicMemberTypeFilter({
  current,
  name,
}: PrismicMemberTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          key={option.value}
          to="/employees"
          search={{
            memberType:
              option.value === "all" ? ("all" as const) : option.value,
            name,
          }}
          className={cn(
            "inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors",
            current === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
