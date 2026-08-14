import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@workspace/db/modules/dashboard";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { queryKeys } from "#/lib/query/query-keys";

export const loadDashboardStats = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async () => {
    return getDashboardStats();
  });

export type DashboardStatsData = Awaited<ReturnType<typeof loadDashboardStats>>;

export function dashboardStatsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardStatsData> => loadDashboardStats(),
    placeholderData: keepPreviousData,
  });
}
