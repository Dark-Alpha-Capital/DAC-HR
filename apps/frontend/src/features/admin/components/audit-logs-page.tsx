import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { useSearch } from "@tanstack/react-router";
import { AuditLogsClient } from "#/features/admin/components/audit-logs-client";
import {
  auditLogsIndexQueryOptions,
} from "#/features/admin/query-options";
import type { AuditLogsPageData } from "#/features/admin/query-options";

export function AuditLogsPage() {
  const search = useSearch({ from: "/_main/admin/audit-logs" });
  const { data, isLoading }: UseQueryResult<AuditLogsPageData> = useQuery(
    auditLogsIndexQueryOptions(search),
  );

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
