import React from "react";
import {
  getCandidateWithApplications,
  getOrCreateCandidateOnboarding,
} from "@workspace/db/queries";
import OnboardingCard from "./onboarding-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Briefcase } from "lucide-react";

type Params = Promise<{ uid: string }>;

interface CandidateOnboardingSectionProps {
  params: Params;
}

const CandidateOnboardingSection = async ({
  params,
}: CandidateOnboardingSectionProps) => {
  const { uid } = await params;

  // Fetch candidate to check if they have a hired application
  const candidate = await getCandidateWithApplications(uid);

  if (!candidate) {
    return null;
  }

  // Check if candidate has been hired (any application with status "hired")
  const isHired = candidate.applications.some((app) => app.status === "hired");

  // If not hired, show message
  if (!isHired) {
    return <div></div>;
  }

  // If hired, fetch and display onboarding data
  const rawData = await getOrCreateCandidateOnboarding(candidate.id);

  if (!rawData) {
    return (
      <Card className="mt-4 md:mt-6 lg:mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Onboarding enabled, but no data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const onboardingData = {
    contractSigned: rawData.contractSigned ?? false,
    registrationEmailSent: rawData.emailProvided ?? false,
    packetSent: rawData.onboardingPacketSent ?? false,
    companyEmailActivate: rawData.companyEmailActivate ?? false,
  };

  return (
    <div className="mt-4 md:mt-6 lg:mt-8">
      <OnboardingCard
        candidateId={candidate.id}
        onboardingData={onboardingData}
      />
    </div>
  );
};

export default CandidateOnboardingSection;
