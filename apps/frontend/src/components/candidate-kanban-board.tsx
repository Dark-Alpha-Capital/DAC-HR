
import { useMemo } from "react";
import ApplicationCard from "~/components/application-card";
import {
  KanbanStatusHeader,
} from "~/components/application-status-badge";
import {
  applicationStatuses,
  normalizeApplicationStatus,
  type ApplicationStatus,
} from "@workspace/db/application-status";

type Application = {
  id: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  position: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  interviews: Array<{
    id: string;
    status: string;
  }>;
};

interface KanbanBoardProps {
  applications: Application[];
}

function normalizeDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export default function KanbanBoard({ applications }: KanbanBoardProps) {
  const columns = useMemo(() => {
    const grouped = new Map<ApplicationStatus, Application[]>();

    applicationStatuses.forEach((status) => {
      grouped.set(status, []);
    });

    applications.forEach((app) => {
      const normalized = normalizeApplicationStatus(app.status);
      if (normalized) {
        grouped.get(normalized)?.push(app);
      }
    });

    return grouped;
  }, [applications]);

  const visibleApplications = applications.filter(
    (app) => normalizeApplicationStatus(app.status) !== null,
  );

  if (visibleApplications.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-muted-foreground">No applications found.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
        {applicationStatuses.map((status) => {
          const columnApps = columns.get(status) || [];

          return (
            <div
              key={status}
              className="w-64 sm:w-72 shrink-0 flex flex-col gap-3"
            >
              <KanbanStatusHeader status={status} count={columnApps.length} />

              <div className="flex flex-col gap-3 min-h-[100px]" role="list">
                {columnApps.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-md bg-muted/30">
                    No candidates
                  </div>
                ) : (
                  columnApps.map((app) => (
                    <div key={app.id} role="listitem">
                      <ApplicationCard
                        application={{
                          ...app,
                          createdAt: normalizeDate(app.createdAt),
                          updatedAt: normalizeDate(app.updatedAt),
                        }}
                        status={status}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
