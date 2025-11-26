import Link from "next/link";
import React, { Suspense } from "react";
import { getAllApplications } from "@workspace/db/queries";
import ApplicationCard from "@/components/application-card";
import { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { ApplicationsListSkeleton } from "@/components/skeletons/applications-list-skeleton";

export const metadata: Metadata = {
  title: "Applications",
  description: "All job applications",
};

const page = async () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Applications</h1>

      <Suspense fallback={<ApplicationsListSkeleton />}>
        <ApplicationsList />
      </Suspense>
    </div>
  );
};

export default page;

const ApplicationsList = async () => {
  const applications = await getAllApplications();

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 border rounded-md">
        <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-1">No applications found.</p>
        <p className="text-sm text-muted-foreground">
          Applications will appear here when candidates apply for positions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
};
