import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/get-session";
import {
  isApplicationStatus,
  type ApplicationStatus,
} from "@workspace/db/application-status";
import {
  getKanbanColumnCandidates,
  KANBAN_PAGE_SIZE_DEFAULT,
} from "@workspace/db/kanban-queries";
import {
  isCandidateSortOption,
  type CandidateSortOption,
} from "@workspace/db/candidate-list-filters";

function parseStringArray(value: string | string[] | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : [value];
  const cleaned = values.filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

function parseLimit(value: string | null): number {
  if (!value) {
    return KANBAN_PAGE_SIZE_DEFAULT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return KANBAN_PAGE_SIZE_DEFAULT;
  }

  return Math.min(Math.max(parsed, 1), 40);
}

export const Route = createFileRoute("/api/kanban/cards")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const url = new URL(request.url);
          const statusParam = url.searchParams.get("status");

          if (!statusParam || !isApplicationStatus(statusParam)) {
            return Response.json(
              { error: "Invalid or missing status parameter" },
              { status: 400 },
            );
          }

          const sortParam = url.searchParams.get("sort");
          const sort: CandidateSortOption | undefined =
            sortParam && isCandidateSortOption(sortParam)
              ? sortParam
              : undefined;

          const page = await getKanbanColumnCandidates(
            statusParam as ApplicationStatus,
            {
              name: url.searchParams.get("name") ?? undefined,
              email: url.searchParams.get("email") ?? undefined,
              position: parseStringArray(
                url.searchParams.getAll("position"),
              ),
              status: parseStringArray(
                url.searchParams.getAll("statusFilter"),
              ),
              source: parseStringArray(url.searchParams.getAll("source")),
              sort,
            },
            url.searchParams.get("cursor") ?? undefined,
            parseLimit(url.searchParams.get("limit")),
          );

          return Response.json(
            {
              items: page.items.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString(),
              })),
              nextCursor: page.nextCursor,
              hasMore: page.hasMore,
              totalCount: page.totalCount,
            },
            { status: 200 },
          );
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "kanban_cards_fetch_failed",
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          );

          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
