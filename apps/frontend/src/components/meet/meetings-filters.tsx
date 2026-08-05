import { useNavigate } from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { localDayBounds } from "~/lib/attendance/meet-attendance";

export type ConferencesSearch = {
  /** Omitted = last 30 days (keeps `<Link>` search-optional). */
  filter?: "30d" | "date";
  date?: string;
};

function todayLocalDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function activeConferenceFilter(
  search: ConferencesSearch,
): "30d" | "date" {
  return search.filter === "date" ? "date" : "30d";
}

export function parseConferencesSearch(
  search: Record<string, unknown>,
): ConferencesSearch {
  const filter =
    search.filter === "date"
      ? "date"
      : search.filter === "30d"
        ? "30d"
        : undefined;
  const date =
    typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
      ? search.date
      : undefined;
  return {
    ...(filter ? { filter } : {}),
    ...(date ? { date } : {}),
  };
}

export function conferencesFilterInput(search: ConferencesSearch) {
  if (activeConferenceFilter(search) === "date" && search.date) {
    const bounds = localDayBounds(search.date);
    return {
      mode: "date" as const,
      date: search.date,
      startIso: bounds.startIso,
      endIso: bounds.endIso,
    };
  }
  return { mode: "30d" as const };
}

export function MeetingsFilters({
  search,
  from,
}: {
  search: ConferencesSearch;
  from: "/employees/attendance/";
}) {
  const navigate = useNavigate({ from });
  const selectedDate = search.date ?? todayLocalDate();
  const filter = activeConferenceFilter(search);

  return (
    <div className="mb-6 flex flex-col gap-3 border border-border bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Range</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "30d" ? "default" : "outline"}
            onClick={() => {
              void navigate({
                search: {},
                replace: true,
              });
            }}
          >
            Last 30 days
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "date" ? "default" : "outline"}
            onClick={() => {
              void navigate({
                search: { filter: "date", date: selectedDate },
                replace: true,
              });
            }}
          >
            Specific date
          </Button>
        </div>
      </div>

      {filter === "date" ? (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="conference-date"
            className="text-xs text-muted-foreground"
          >
            Date
          </Label>
          <Input
            id="conference-date"
            type="date"
            className="w-auto bg-background"
            value={selectedDate}
            max={todayLocalDate()}
            onChange={(event) => {
              const next = event.target.value;
              if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
              void navigate({
                search: { filter: "date", date: next },
                replace: true,
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
