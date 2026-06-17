import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AuditLogsClient,
  type AuditLog,
} from "~/components/admin/audit-logs-client";
import { loadAuditLogs } from "~/lib/loaders/admin";
import { toOptionalString, toPageNumber } from "~/lib/parse-search";

type AuditLogsLoaderResult =
  | { unauthorized: true }
  | { forbidden: true }
  | {
      unauthorized: false;
      forbidden: false;
      logs: AuditLog[];
      total: number;
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };

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
    const result = (await loadAuditLogs({
      data: deps,
    })) as AuditLogsLoaderResult;
    if ("unauthorized" in result && result.unauthorized) {
      throw redirect({ to: "/login" });
    }
    if ("forbidden" in result && result.forbidden) {
      throw redirect({ to: "/" });
    }
    const { unauthorized: _, forbidden: __, ...data } = result;
    return data;
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
