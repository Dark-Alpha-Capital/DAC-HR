import React from "react";
import { Suspense } from "react";
import { getAuditLogs } from "@workspace/db/queries";
import { AuditLogsClient, AuditLog } from "./audit-logs-client";

type SearchParams = Promise<{
  action?: string | string[];
  entityType?: string | string[];
  userId?: string | string[];
  search?: string | string[];
  page?: string | string[];
}>;

async function fetchAuditLogs(
  action?: string,
  entityType?: string,
  userId?: string,
  search?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ logs: AuditLog[]; total: number }> {
  const result = await getAuditLogs({
    action,
    entityType,
    userId,
    search,
    page,
    limit,
  });

  return {
    logs: result.logs as AuditLog[],
    total: result.total,
  };
}

async function AuditLogsSectionInner({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Extract filter parameters
  const action = params.action
    ? typeof params.action === "string"
      ? params.action
      : params.action[0]
    : undefined;

  const entityType = params.entityType
    ? typeof params.entityType === "string"
      ? params.entityType
      : params.entityType[0]
    : undefined;

  const userId = params.userId
    ? typeof params.userId === "string"
      ? params.userId
      : params.userId[0]
    : undefined;

  const search = params.search
    ? typeof params.search === "string"
      ? params.search
      : params.search[0]
    : undefined;

  // Extract page number (default to 1)
  const page = params.page
    ? typeof params.page === "string"
      ? parseInt(params.page, 10)
      : Array.isArray(params.page) && params.page[0]
        ? parseInt(params.page[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;
  const limit = 20;

  const { logs, total } = await fetchAuditLogs(
    action,
    entityType,
    userId,
    search,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <AuditLogsClient
      logs={logs}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      hasNextPage={currentPage < totalPages}
      hasPreviousPage={currentPage > 1}
    />
  );
}

export function AuditLogsSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="mt-8 text-sm text-muted-foreground">
          Loading audit logs...
        </div>
      }
    >
      <AuditLogsSectionInner searchParams={searchParams} />
    </Suspense>
  );
}
