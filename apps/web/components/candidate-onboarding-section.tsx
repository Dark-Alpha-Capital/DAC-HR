import React from "react";
import { getOrCreateCandidateOnboarding } from "@workspace/db/queries";
import OnboardingCard from "./onboarding-card";
import { getCachedCandidate } from "@/lib/cache/candidate";

async function CachedCandidateOnboardingSection({ uid }: { uid: string }) {
  const candidate = await getCachedCandidate(uid);

  if (!candidate) {
    return null;
  }

  const rawData = await getOrCreateCandidateOnboarding(candidate.id);

  if (!rawData) {
    return (
      <div className="mt-4 md:mt-6 lg:mt-8">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Checklist
        </h3>
        <p className="text-sm text-muted-foreground">
          Checklist enabled, but no data available.
        </p>
      </div>
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
}

export default CachedCandidateOnboardingSection;
