import React from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import ApplicationTabsContent from "@/components/application-tabs-content";

interface ApplicationDetailInlineProps {
  applicationId: string;
  interviewId?: string;
  currentUser?: { id: string; email?: string | null; name?: string | null };
  users: {
    id: string;
    name: string | null;
    email: string;
  }[];
}

export default async function ApplicationDetailInline({
  applicationId,
  interviewId,
  currentUser,
  users,
}: ApplicationDetailInlineProps) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`application-${applicationId}`);

  const application = await getApplicationWithInterviews(applicationId);

  if (!application) {
    return (
      <div className="text-sm text-muted-foreground">
        Application details could not be loaded.
      </div>
    );
  }

  // Add position cache tag to enable invalidation when rounds change
  cacheTag(`position-${application.positionId}`);

  return (
    <ApplicationTabsContent
      application={application}
      applicationId={applicationId}
      interviewId={interviewId}
      currentUser={currentUser}
      users={users}
    />
  );
}

