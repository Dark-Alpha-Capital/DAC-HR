import React, { Suspense } from "react";
import { getPositions } from "@workspace/db/queries";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import WeeklyCheckinForm from "@/components/forms/weekly-checkin-form";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { hasWeeklyCheckinViewerAccess } from "@/lib/config/weekly-checkin-access";

export const metadata: Metadata = {
  title: "Weekly Check-in",
  description: "Submit your weekly recruiting activity report",
};

const page = async () => {
  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-8">
      <Button variant="ghost" asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>

      <Suspense fallback={<FormLoadingFallback />}>
        <DisplayWeeklyCheckinForm />
      </Suspense>
    </div>
  );
};

export default page;

async function DisplayWeeklyCheckinForm() {
  const userSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!userSession) {
    redirect("/login");
  }

  if (!hasWeeklyCheckinViewerAccess(userSession.user.email)) {
    redirect("/dashboard");
  }

  const positions = await getPositions();
  const cleanedPositions = positions.positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));

  return (
    <WeeklyCheckinForm
      positions={cleanedPositions}
      userName={userSession.user.name || undefined}
    />
  );
}
