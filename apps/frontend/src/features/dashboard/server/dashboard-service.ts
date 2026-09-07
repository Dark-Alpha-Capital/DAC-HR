import { getDashboardStats } from "@workspace/db/repositories/dashboard-repository";
import { cached } from "#/lib/data-cache";

export const dashboardService = {
  async getStats() {
    // Stats change only on writes; a 15s in-isolate cache absorbs the repeated
    // full-page reads (SSR + client refetch + navigation) between changes.
    return cached("dashboard", "stats", () => getDashboardStats(), {
      ttlMs: 15_000,
    });
  },
};
