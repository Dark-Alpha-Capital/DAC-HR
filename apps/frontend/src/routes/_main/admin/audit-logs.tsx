import { createFileRoute } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { AuditLogsPage } from "#/features/admin/components/audit-logs-page";
import {
  parseAuditLogsSearch,
  auditLogsIndexQueryOptions,
} from "#/features/admin/query-options";

export const Route = createFileRoute("/_main/admin/audit-logs")({
  head: () => ({
    meta: [{ title: "Audit Logs" }],
  }),
  validateSearch: parseAuditLogsSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const search = parseAuditLogsSearch(location.search);
    await queryClient.ensureQueryData(auditLogsIndexQueryOptions(search));
  },
  pendingComponent: () => <ListPageSkeleton rowCount={8} showActions={false} />,
  component: AuditLogsPage,
});
