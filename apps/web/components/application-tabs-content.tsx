"use client";

import React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
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

      <TabsContent value="overview" className="mt-6 space-y-6">
        <div className="space-y-3">
          <ApplicationStatusDisplay application={application} />
        </div>

        <div className="space-y-3">
          <ApplicationPersonalitySelector
            applicationId={applicationId}
            currentPersonality={application.personality}
          />
        </div>
      </TabsContent>

      <TabsContent value="interviews" className="mt-6">
        <div className="space-y-3">
          <ApplicationProgressTimeline
            rounds={application.rounds}
            interviews={application.interviews}
            applicationId={applicationId}
            selectedInterviewId={interviewId}
            currentUser={currentUser}
            users={users}
            application={application}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
