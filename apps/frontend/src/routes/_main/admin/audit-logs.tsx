import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsClient } from "~/components/admin/audit-logs-client";
import { auditLogsIndexQueryOptions } from "~/lib/query/options/admin";
import { useAuditLogsIndex } from "~/hooks/queries/use-admin-index";
import { toOptionalString, toPageNumber } from "~/lib/parse-search";

function parseAuditLogsSearch(search: Record<string, unknown>) {
  return {
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
  };
}

export const Route = createFileRoute("/_main/admin/audit-logs")({
  head: () => ({
    meta: [{ title: "Audit Logs" }],
  }),
  validateSearch: parseAuditLogsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseAuditLogsSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(auditLogsIndexQueryOptions(search));
  },
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const search = Route.useSearch();
  const { data, isLoading } = useAuditLogsIndex(search);

  if (isLoading && !data) {
    return <ListPageSkeleton rowCount={8} showActions={false} />;
  }

  if (!data) {
    return null;
  }

  const { logs, total, currentPage, totalPages, hasNextPage, hasPreviousPage } =
    data;

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
