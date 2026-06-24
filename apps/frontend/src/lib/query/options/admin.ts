import { queryOptions } from "@tanstack/react-query";
import { fetchNonAdminUsers } from "~/lib/admin/fetch-non-admin-users";
import { loadAuditLogs, type AuditLogsPageData } from "~/lib/loaders/admin";
import { queryKeys } from "~/lib/query/query-keys";

export type AdminUsersIndexDeps = {
  name?: string;
  email?: string;
  page?: number;
};

export type AuditLogsIndexDeps = {
  action?: string;
  entityType?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
};

export function adminUsersIndexQueryOptions(deps: AdminUsersIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.admin.usersList(deps),
    queryFn: async () => {
      const currentPage = deps.page ?? 1;
      const limit = 10;
      const { users, total } = await fetchNonAdminUsers({
        data: {
          name: deps.name,
          email: deps.email,
          page: currentPage,
          limit,
        },
      });
      const totalPages = Math.ceil(total / limit);

      return {
        users,
        total,
        currentPage,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      };
    },
  });
}

export function auditLogsIndexQueryOptions(deps: AuditLogsIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.admin.auditLogs(deps),
    queryFn: (): Promise<AuditLogsPageData> => loadAuditLogs({ data: deps }),
  });
}
