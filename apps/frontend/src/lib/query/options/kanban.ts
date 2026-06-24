import { infiniteQueryOptions } from "@tanstack/react-query";
import type { ApplicationStatus } from "@workspace/db/application-status";
import {
  buildKanbanCardsUrl,
  KANBAN_COLUMN_PAGE_SIZE,
  type KanbanFilters,
  type KanbanPage,
} from "~/lib/kanban/types";
import { queryKeys } from "~/lib/query/query-keys";

async function fetchKanbanColumnPage(url: string): Promise<KanbanPage> {
  const response = await fetch(url);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Failed to load kanban column");
  }

  return response.json() as Promise<KanbanPage>;
}

export function kanbanColumnQueryOptions(
  status: ApplicationStatus,
  filters: KanbanFilters = {},
  limit: number = KANBAN_COLUMN_PAGE_SIZE,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.kanban.column(status, filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchKanbanColumnPage(
        buildKanbanCardsUrl(status, filters, pageParam, limit),
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
