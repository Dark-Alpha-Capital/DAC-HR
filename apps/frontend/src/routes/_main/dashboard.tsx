import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage, DashboardPagePending } from "#/features/dashboard/components/dashboard-page";
import { dashboardStatsQueryOptions } from "#/features/dashboard/server/queries/stats";

export const Route = createFileRoute("/_main/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard - DAC HR" }],
  }),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(dashboardStatsQueryOptions());
  },
  pendingComponent: DashboardPagePending,
  component: DashboardPage,
});
