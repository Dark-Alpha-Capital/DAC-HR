import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsClient } from "~/components/admin/audit-logs-client";
import { loadAuditLogs, type AuditLogsPageData } from "~/lib/loaders/admin";
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
  loader: async ({ deps }): Promise<AuditLogsPageData> => {
    return loadAuditLogs({ data: deps });
  },
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const { logs, total, currentPage, totalPages, hasNextPage, hasPreviousPage } =
    Route.useLoaderData();

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
