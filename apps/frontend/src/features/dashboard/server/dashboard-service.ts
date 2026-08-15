import { getDashboardStats } from "@workspace/db/modules/dashboard";

export const dashboardService = {
  async getStats() {
    return getDashboardStats();
  },
};
