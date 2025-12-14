import React, { Suspense } from "react";
import { UserIsAdmin } from "@/components/auth-checks";
import { AuditLogsSection } from "./audit-logs-section";

type SearchParams = Promise<{
  action?: string | string[];
  entityType?: string | string[];
  userId?: string | string[];
  search?: string | string[];
  page?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
}>;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Suspense>
        <UserIsAdmin />
      </Suspense>
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          View and filter system activity logs and user actions
        </p>
      </div>

      <div className="border-t pt-8 mt-4">
        <AuditLogsSection searchParams={searchParams} />
      </div>
    </div>
  );
}
