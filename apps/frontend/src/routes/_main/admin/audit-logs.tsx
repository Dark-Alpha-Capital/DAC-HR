import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AuditLogsClient,
  type AuditLog,
} from "~/components/admin/audit-logs-client";
import { getAuditLogs } from "@workspace/db/repositories/audit-repository";
import { getSession } from "~/lib/get-session";
import { toOptionalString, toPageNumber } from "~/lib/parse-search";

export const Route = createFileRoute("/_main/admin/audit-logs")({
  head: () => ({
    meta: [{ title: "Audit Logs" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    action: toOptionalString(search.action),
    entityType: toOptionalString(search.entityType),
    userId: toOptionalString(search.userId),
    search: toOptionalString(search.search),
    startDate: toOptionalString(search.startDate),
    endDate: toOptionalString(search.endDate),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "admin") {
      throw redirect({ to: "/" });
    }

    const currentPage = deps.page ?? 1;
    const limit = 20;

    const result = await getAuditLogs({
      action: deps.action,
      entityType: deps.entityType,
      userId: deps.userId,
      search: deps.search,
      page: currentPage,
      limit,
      startDate: deps.startDate ? new Date(deps.startDate) : undefined,
      endDate: deps.endDate ? new Date(deps.endDate) : undefined,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      logs: result.logs as AuditLog[],
      total: result.total,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  },
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const {
    logs,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          View and filter system activity logs and user actions
        </p>
      </div>

      <div className="border-t pt-8 mt-4">
        <AuditLogsClient
          logs={logs}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      </div>
    </div>
  );
}
