import { getDashboardStats } from "@workspace/db/repositories/dashboard-repository";

export const dashboardService = {
  async getStats() {
    return getDashboardStats();
  },
};
