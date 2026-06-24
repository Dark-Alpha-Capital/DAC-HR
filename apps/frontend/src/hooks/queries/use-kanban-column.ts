import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ApplicationStatus } from "@workspace/db/application-status";
import {
  kanbanColumnQueryOptions,
} from "~/lib/query/options/kanban";
import {
  KANBAN_COLUMN_PAGE_SIZE,
  type KanbanFilters,
} from "~/lib/kanban/types";

export function useKanbanColumn(
  status: ApplicationStatus,
  filters: KanbanFilters = {},
  limit: number = KANBAN_COLUMN_PAGE_SIZE,
) {
  const query = useInfiniteQuery(
    kanbanColumnQueryOptions(status, filters, limit),
  );

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );

  const totalCount = query.data?.pages[0]?.totalCount;

  return {
    ...query,
    allItems,
    totalCount,
  };
}

export type { KanbanFilters };
