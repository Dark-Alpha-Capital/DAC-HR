import CandidateUploadForm from "@/components/forms/candidate-upload-form";
import React, { Suspense } from "react";
import { FormLoadingFallback } from "@/components/skeletons/form-loading-skeleton";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { getPositions } from "@workspace/db/queries";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Candidate",
  description: "Create a new candidate",
};

const page = async () => {
  return (
    <div className="narrow-container mx-auto py-6 space-y-8">
      <Button asChild>
        <Link href="/candidates">Back to Candidates</Link>
      </Button>

      <div className="mt-4 md:mt-6 lg:mt-8">
        <Suspense fallback={<FormLoadingFallback />}>
          <DisplayCandidateUploadForm />
        </Suspense>
      </div>
    </div>
  );
};

export default page;

async function DisplayCandidateUploadForm() {
  const userSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!userSession) {
    redirect("/login");
  }

  const positions = await getPositions();
  const cleanedPositions = positions.map((position) => ({
    id: position.id,
    name: position.name,
  }));
  return (
    <CandidateUploadForm
      positions={cleanedPositions}
      userSession={userSession.session}
    />
  );
}
