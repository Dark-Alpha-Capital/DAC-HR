import { createServerFn } from "@tanstack/react-start";
import { getAuditLogs } from "@workspace/db/repositories/audit-repository";
import { getSession } from "~/lib/server/session.server";

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
  .validator((data: AuditLogsInput) => data)
  .handler(async ({ data: deps }) => {
    const session = await getSession();
    if (!session?.user) {
      return { unauthorized: true as const };
    }
    if (session.user.role !== "admin") {
      return { forbidden: true as const };
    }

    const currentPage = deps.page ?? 1;
    const limit = 20;

    const result = await getAuditLogs({
      action: deps.action,
      entityType: deps.entityType,
      userId: deps.userId,
      search: deps.search,
      page: currentPage,
      limit,
      startDate: deps.startDate ? new Date(deps.startDate) : undefined,
      endDate: deps.endDate ? new Date(deps.endDate) : undefined,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      unauthorized: false as const,
      forbidden: false as const,
      logs: result.logs,
      total: result.total,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  });
