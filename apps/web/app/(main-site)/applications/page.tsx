import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import React, { Suspense } from "react";
import { getAllApplications } from "@workspace/db/queries";
import ApplicationCard from "@/components/application-card";
import { Metadata } from "next";
import { Briefcase, CloudCog } from "lucide-react";

export const metadata: Metadata = {
  title: "Applications",
  description: "All job applications",
};

const page = async () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Applications</h1>
      </div>

      <Suspense fallback={<ApplicationsLoadingSkeleton />}>
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
      <div className="text-center py-12">
        <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">No applications found.</p>
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

const ApplicationsLoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="border rounded-lg p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-10 bg-muted rounded mt-4" />
        </div>
      ))}
    </div>
  );
};
