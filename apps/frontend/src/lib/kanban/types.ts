import type { ApplicationStatus } from "@workspace/db/application-status";
import type { CandidateSortOption } from "@workspace/db/candidate-list-filters";

export type KanbanCard = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string | null;
  sourceUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  position: { id: string; name: string } | null;
  applicationStatus: string | null;
};

export type KanbanPage = {
  items: KanbanCard[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
};

export type KanbanFilters = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  source?: string[];
  sort?: CandidateSortOption;
};

export type KanbanColumnParams = {
  status: ApplicationStatus;
  filters?: KanbanFilters;
  limit?: number;
};

export const KANBAN_COLUMN_PAGE_SIZE = 30;

export function buildKanbanCardsUrl(
  status: ApplicationStatus,
  filters: KanbanFilters = {},
  cursor?: string,
  limit: number = KANBAN_COLUMN_PAGE_SIZE,
): string {
  const params = new URLSearchParams();
  params.set("status", status);
  params.set("limit", String(limit));

  if (cursor) {
    params.set("cursor", cursor);
  }
  if (filters.name) {
    params.set("name", filters.name);
  }
  if (filters.email) {
    params.set("email", filters.email);
  }
  if (filters.sort) {
    params.set("sort", filters.sort);
  }
  filters.position?.forEach((value) => params.append("position", value));
  filters.status?.forEach((value) => params.append("statusFilter", value));
  filters.source?.forEach((value) => params.append("source", value));

  return `/api/kanban/cards?${params.toString()}`;
}
