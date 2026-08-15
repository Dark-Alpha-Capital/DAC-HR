import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { queryKeys } from "#/lib/query/query-keys";
import { dashboardService } from "../dashboard-service";

export const loadDashboardStats = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(() => dashboardService.getStats());

export type DashboardStatsData = Awaited<ReturnType<typeof loadDashboardStats>>;

export function dashboardStatsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardStatsData> => loadDashboardStats(),
    placeholderData: keepPreviousData,
  });
}
