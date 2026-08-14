import { localDayBounds } from "#/features/attendance/meet-attendance";

export type ConferencesSearch = {
  /** Omitted = last 30 days (keeps `<Link>` search-optional). */
  filter?: "30d" | "date";
  date?: string;
};

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
