import { Suspense } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Briefcase, Calendar, ChevronDown, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getUsers } from "@workspace/db/queries";
import InlineApplicationStatusEditor from "@/components/inline-application-status-editor";
import ApplicationDetailInline from "@/components/application-detail-inline";
import { SectionSkeleton } from "@/components/skeletons/section-skeleton";
import { getCachedCandidate } from "@/lib/cache/candidate";

type Candidate = NonNullable<
  Awaited<ReturnType<typeof getCachedCandidate>>
>;
type Users = Awaited<ReturnType<typeof getUsers>>;

export function ApplicationsTab({
  candidate,
  users,
  initialApplicationId,
  currentUser,
}: {
  candidate: Candidate;
  users: Users;
  initialApplicationId?: string;
  currentUser: { id: string; email?: string | null; name?: string | null };
}) {
  if (!candidate) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Applications</h2>
        </div>
        <Badge variant="secondary">{candidate.applications.length}</Badge>
      </div>
      {candidate.applications.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No applications found for this candidate.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {candidate.applications.map((app, index) => (
            <details
              key={app.id}
              className="group py-4 first:pt-0 [&[open]_summary_svg]:rotate-180"
              open={
                initialApplicationId
                  ? app.id === initialApplicationId
                  : index === 0
              }
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-medium line-clamp-2">
                      {app.position.name}
                    </h3>
                    <InlineApplicationStatusEditor
                      application={{ id: app.id, status: app.status }}
                      candidateId={candidate.id}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0" />
                      Applied {formatDate(app.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 shrink-0" />
                      {app.interviews?.length || 0}{" "}
                      {app.interviews?.length === 1
                        ? "interview"
                        : "interviews"}
                    </span>
                    {app.personality && (
                      <Badge variant="secondary" className="text-xs">
                        {app.personality}
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
              </summary>
              <div className="mt-4 pl-0">
                <Suspense fallback={<SectionSkeleton />}>
                  <ApplicationDetailInline
                    applicationId={app.id}
                    currentUser={currentUser}
                    users={users}
                  />
                </Suspense>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
