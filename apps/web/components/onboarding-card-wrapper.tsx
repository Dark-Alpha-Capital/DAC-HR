"use client";

import OnboardingCard from "./onboarding-card";

interface OnboardingCardWrapperProps {
  candidateId: string;
  onboardingData: any;
}

export default function OnboardingCardWrapper({
  candidateId,
  onboardingData,
}: OnboardingCardWrapperProps) {
  if (!onboardingData) return null;
  return <OnboardingCard candidateId={candidateId} onboardingData={onboardingData} />;
}
