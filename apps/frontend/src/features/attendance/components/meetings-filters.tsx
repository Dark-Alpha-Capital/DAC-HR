import { useNavigate } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  parseConferencesSearch,
  conferencesFilterInput,
  activeConferenceFilter,
  type ConferencesSearch,
} from "#/features/attendance/conferences-search";

export {
  parseConferencesSearch,
  conferencesFilterInput,
  activeConferenceFilter,
  type ConferencesSearch,
};

function todayLocalDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
