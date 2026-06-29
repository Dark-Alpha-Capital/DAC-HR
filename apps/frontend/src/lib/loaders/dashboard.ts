import { createServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@workspace/db/queries";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";

export const loadDashboardStats = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async () => {
    return getDashboardStats();
  });
