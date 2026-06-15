import React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { FileText, MessageSquare } from "lucide-react";
import ApplicationProgressTimeline from "@/components/application-progress-timeline";
import ApplicationStatusDisplay from "@/components/application-status-display";
import ApplicationPersonalitySelector from "@/components/application-personality-selector";

interface ApplicationTabsContentProps {
  application: any;
  applicationId: string;
  interviewId?: string;
  currentUser: any;
  users: any[];
}

export default function ApplicationTabsContent({
  application,
  applicationId,
  interviewId,
  currentUser,
  users,
}: ApplicationTabsContentProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="interviews" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Interviews
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <div className="space-y-8">
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Application Status
            </h3>
            <ApplicationStatusDisplay application={application} />
          </section>
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Personality Type
            </h3>
            <ApplicationPersonalitySelector
              applicationId={applicationId}
              currentPersonality={application.personality}
            />
          </section>
        </div>
      </TabsContent>

      <TabsContent value="interviews" className="mt-6">
        <ApplicationProgressTimeline
          rounds={application.rounds}
          interviews={application.interviews}
          applicationId={applicationId}
          selectedInterviewId={interviewId}
          currentUser={currentUser}
          users={users}
          application={application}
        />
      </TabsContent>
    </Tabs>
  );
}
