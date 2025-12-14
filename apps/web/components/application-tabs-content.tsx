"use client";

import React from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationStatusDisplay application={application} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personality Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationPersonalitySelector
                applicationId={applicationId}
                currentPersonality={application.personality}
              />
            </CardContent>
          </Card>
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
