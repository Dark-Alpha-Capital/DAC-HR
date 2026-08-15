import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString, toPageNumber } from "#/lib/parse-search";
import {
  loadAuditLogs,
} from "./server/queries/audit-logs";

export type { AuditLogsPageData } from "./server/admin-service";

// Raw search params from the router. Values are unconstrained until parsed;
// each field is narrowed by toOptionalString / toPageNumber.
interface AuditLogsSearchInput {
  action?: unknown;
  entityType?: unknown;
  userId?: unknown;
  search?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  page?: unknown;
}

export function parseAuditLogsSearch(search: AuditLogsSearchInput) {
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
        : undefined,
  };
}

export type AuditLogsIndexSearch = ReturnType<typeof parseAuditLogsSearch>;

export function auditLogsIndexQueryOptions(deps: AuditLogsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.admin.auditLogs(deps),
    queryFn: async () => loadAuditLogs({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
