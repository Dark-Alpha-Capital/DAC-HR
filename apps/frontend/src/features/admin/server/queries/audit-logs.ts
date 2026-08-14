import { createServerFn } from "@tanstack/react-start";
import { serverFnAdminGuard } from "#/lib/middleware/auth-guard";
import { getAuditLogs } from "@workspace/db/repositories/audit-repository";

type AuditLogsInput = {
  action?: string;
  entityType?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
};

export type AuditLogRow = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogsPageData = {
  logs: AuditLogRow[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export const loadAuditLogs = createServerFn({ method: "GET" })
  .middleware([serverFnAdminGuard])
  .validator((data: AuditLogsInput) => data)
  .handler(async ({ data: deps }) => {
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
      logs: result.logs.map((log) => ({
        ...log,
        details: log.details as AuditLogRow["details"],
      })),
      total: result.total,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  });

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString, toPageNumber } from "#/lib/parse-search";

export function parseAuditLogsSearch(search: Record<string, unknown>) {
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

export type AuditLogsIndexSearch = ReturnType<typeof parseAuditLogsSearch>;

export function auditLogsIndexQueryOptions(deps: AuditLogsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.admin.auditLogs(deps),
    queryFn: async (): Promise<AuditLogsPageData> =>
      loadAuditLogs({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
