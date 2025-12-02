"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { toggleOnboardingTask } from "@/lib/actions/update-onboarding";

type OnboardingCardProps = {
  candidateId: string;
  onboardingData: {
    contractSigned: boolean;
    registrationEmailSent: boolean;
    packetSent: boolean;
    companyEmailActivate: boolean;
  };
};

const OnboardingCard: React.FC<OnboardingCardProps> = ({
  candidateId,
  onboardingData,
}) => {
  const [contractSigned, setContractSigned] = useState(
    onboardingData.contractSigned
  );
  const [registrationEmailSent, setRegistrationEmailSent] = useState(
    onboardingData.registrationEmailSent
  );
  const [packetSent, setPacketSent] = useState(onboardingData.packetSent);
  const [companyEmailActivate, setCompanyEmailActivate] = useState(onboardingData.companyEmailActivate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        await toggleOnboardingTask(candidateId, "contractSigned", !!contractSigned);
        await toggleOnboardingTask(candidateId, "emailProvided", !!registrationEmailSent);
        await toggleOnboardingTask(candidateId, "onboardingPacketSent", !!packetSent);
        await toggleOnboardingTask(candidateId, "companyEmailActivate", !!companyEmailActivate);
    } catch (err) {
      console.error("Error saving onboarding tasks", err);
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Onboarding Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sign Contract */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={contractSigned}
              onCheckedChange={(checked) => setContractSigned(!!checked)}
              id="contract-signed"
            />
            <label htmlFor="contract-signed" className="font-medium">
              Contract Signed
            </label>
          </div>

          {/* Registration Email */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={registrationEmailSent}
              onCheckedChange={(checked) =>
                setRegistrationEmailSent(!!checked)
              }
              id="registration-email-sent"
            />
            <label htmlFor="registration-email-sent" className="font-medium">
              Welcome Email Sent
            </label>
          </div>

          {/* Onboarding Packet */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={packetSent}
              onCheckedChange={(checked) => setPacketSent(!!checked)}
              id="packet-sent"
            />
            <label htmlFor="packet-sent" className="font-medium">
              Onboarding Packet Sent
            </label>
          </div>

          {/* Company Email Activate */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={companyEmailActivate}
              onCheckedChange={(checked) => setCompanyEmailActivate(!!checked)}
              id="packet-sent"
            />
            <label htmlFor="packet-sent" className="font-medium">
              Company Email Activate
            </label>
          </div>

          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Tasks"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default OnboardingCard;
