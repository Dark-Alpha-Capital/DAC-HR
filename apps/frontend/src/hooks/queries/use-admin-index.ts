import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  adminUsersIndexQueryOptions,
  auditLogsIndexQueryOptions,
  type AdminUsersIndexDeps,
  type AuditLogsIndexDeps,
} from "~/lib/query/options/admin";

export function useAdminUsersIndex(deps: AdminUsersIndexDeps) {
  return useQuery({
    ...adminUsersIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}

export function useAuditLogsIndex(deps: AuditLogsIndexDeps) {
  return useQuery({
    ...auditLogsIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
