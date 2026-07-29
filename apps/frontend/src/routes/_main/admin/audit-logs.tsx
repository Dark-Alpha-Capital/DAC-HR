import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { AuditLogsClient } from "~/components/admin/audit-logs-client";
import { loadAuditLogs, type AuditLogsPageData } from "~/lib/loaders/admin";
import { toOptionalString, toPageNumber } from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

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

type AuditLogsIndexSearch = ReturnType<typeof parseAuditLogsSearch>;

function auditLogsIndexQueryOptions(deps: AuditLogsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.admin.auditLogs(deps),
    queryFn: async (): Promise<AuditLogsPageData> =>
      loadAuditLogs({ data: deps }),
    placeholderData: keepPreviousData,
  });
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
