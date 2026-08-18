import type { MouseEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "#/components/ui/badge";
import { Briefcase, Calendar, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { formatDate } from "#/lib/utils";
import {
  getApplicationStatusLabel,
  applicationStatusBadgeVariants,
} from "#/lib/application-status";
import type { CandidateWithApplications } from "#/features/candidates/types";
import { CreateApplicationDialog } from "#/features/applications/components/create-application-dialog";
import { applicationDetailQueryOptions } from "#/features/applications/query-options";

type Candidate = CandidateWithApplications;
export function CandidateApplicationsTab({
  candidate,
}: {
  candidate: Candidate;
}) {
  const navigate = useNavigate({ from: "/candidates/$uid/" });
  const queryClient = useQueryClient();
  const existingPositionIds = candidate.applications.map(
    (app) => app.position.id,
  );

  const openApplicationSheet = (applicationId: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        applicationId,
      }),
    });
  };

  const shouldOpenSheet = (event: MouseEvent<HTMLAnchorElement>) =>
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Applications</h2>
          <CreateApplicationDialog
            candidateId={candidate.id}
            existingPositionIds={existingPositionIds}
          />
        </div>
        <Badge variant="secondary">{candidate.applications.length}</Badge>
      </div>
      {candidate.applications.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-4">
            No applications found for this candidate.
          </p>
          <CreateApplicationDialog
            candidateId={candidate.id}
            existingPositionIds={existingPositionIds}
            variant="empty-state"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {candidate.applications.map((app) => (
            <Link
              key={app.id}
              to="/applications/$id"
              params={{ id: app.id }}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              onPointerEnter={() => {
                void queryClient.prefetchQuery(
                  applicationDetailQueryOptions(app.id),
                );
              }}
              onClick={(event) => {
                if (!shouldOpenSheet(event)) {
                  return;
                }

                event.preventDefault();
                openApplicationSheet(app.id);
              }}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium truncate">
                    {app.position.name}
                  </h3>
                  <Badge
                    variant={applicationStatusBadgeVariants[app.status]}
                    className="text-xs shrink-0"
                  >
                    {getApplicationStatusLabel(app.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 shrink-0" />
                    Added {formatDate(app.createdAt)}
                  </span>
                  {app.interviews?.length != null ? (
                    <span>
                      {app.interviews.length}{" "}
                      {app.interviews.length === 1 ? "interview" : "interviews"}
                    </span>
                  ) : null}
                  {app.personality ? (
                    <Badge variant="secondary" className="text-xs">
                      {app.personality}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
