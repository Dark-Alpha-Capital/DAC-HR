/**
 * Pure candidate list sorting — no db imports, directly unit-testable.
 */
import type { CandidateSortOption } from "./candidate-list-filters";

export type CandidateListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  position: { id: string; name: string } | null;
};

export function sortCandidateListItems(
  items: CandidateListItem[],
  sort: CandidateSortOption,
): CandidateListItem[] {
  const sorted = [...items];

  switch (sort) {
    case "oldest":
      return sorted.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
    case "name_asc":
      return sorted.sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      );
    case "name_desc":
      return sorted.sort(
        (a, b) =>
          b.lastName.localeCompare(a.lastName) ||
          b.firstName.localeCompare(a.firstName),
      );
    case "updated":
      return sorted.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      );
    case "newest":
    default:
      return sorted.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
  }
}
