import { createServerFn } from "@tanstack/react-start";
import { serverFnAdminGuard } from "#/features/auth/server/auth-middleware";
import { adminService } from "../admin-service";

type AuditLogsInput = {
  action?: string;
  entityType?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
};

export const loadAuditLogs = createServerFn({ method: "GET" })
  .middleware([serverFnAdminGuard])
  .validator((data: AuditLogsInput) => data)
  .handler(async ({ data: deps }) => adminService.listAuditLogs(deps));
