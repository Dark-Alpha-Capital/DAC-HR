"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import { updateOnboardingTasks } from "@/lib/actions/update-onboarding";
import { toast } from "sonner";
import {
  FileSignature,
  Mail,
  Package,
  MailCheck,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

type OnboardingCardProps = {
  candidateId: string;
  onboardingData: {
    contractSigned: boolean;
    registrationEmailSent: boolean;
    packetSent: boolean;
    companyEmailActivate: boolean;
  };
};

const onboardingTasks = [
  {
    id: "contractSigned",
    label: "Contract Signed",
    description: "Employment contract has been signed by the candidate",
    icon: FileSignature,
    key: "contractSigned" as const,
  },
  {
    id: "registrationEmailSent",
    label: "Welcome Email Sent",
    description: "Registration and welcome email has been sent",
    icon: Mail,
    key: "registrationEmailSent" as const,
  },
  {
    id: "packetSent",
    label: "Onboarding Packet Sent",
    description: "Onboarding documentation packet has been delivered",
    icon: Package,
    key: "packetSent" as const,
  },
  {
    id: "companyEmailActivate",
    label: "Company Email Activated",
    description: "Company email account has been created and activated",
    icon: MailCheck,
    key: "companyEmailActivate" as const,
  },
];

const OnboardingCard: React.FC<OnboardingCardProps> = ({
  candidateId,
  onboardingData,
}) => {
  const [tasks, setTasks] = useState({
    contractSigned: onboardingData.contractSigned,
    registrationEmailSent: onboardingData.registrationEmailSent,
    packetSent: onboardingData.packetSent,
    companyEmailActivate: onboardingData.companyEmailActivate,
  });
  const [isPending, startTransition] = useTransition();

  const progress = useMemo(() => {
    const completed = Object.values(tasks).filter(Boolean).length;
    return (completed / onboardingTasks.length) * 100;
  }, [tasks]);

  const hasChanges = useMemo(() => {
    return (
      tasks.contractSigned !== onboardingData.contractSigned ||
      tasks.registrationEmailSent !== onboardingData.registrationEmailSent ||
      tasks.packetSent !== onboardingData.packetSent ||
      tasks.companyEmailActivate !== onboardingData.companyEmailActivate
    );
  }, [tasks, onboardingData]);

  const handleTaskChange = (key: keyof typeof tasks, checked: boolean) => {
    setTasks((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      toast.info("No changes to save", {
        position: "bottom-right",
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateOnboardingTasks(candidateId, {
          contractSigned: tasks.contractSigned,
          emailProvided: tasks.registrationEmailSent,
          onboardingPacketSent: tasks.packetSent,
          companyEmailActivate: tasks.companyEmailActivate,
        });

        if (result.success) {
          toast.success("Onboarding tasks updated successfully", {
            position: "bottom-right",
            description: "All changes have been saved.",
          });
        } else {
          throw new Error(result.error || "Failed to update tasks");
        }
      } catch (err) {
        console.error("Error saving onboarding tasks", err);
        toast.error("Failed to update onboarding tasks", {
          position: "bottom-right",
          description:
            err instanceof Error ? err.message : "Please try again later.",
        });
      }
    });
  };

  return (
    <Card className="mt-4 md:mt-6 lg:mt-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Onboarding Tasks</CardTitle>
            <CardDescription className="mt-1">
              Track and manage the onboarding process
            </CardDescription>
          </div>
          <Badge variant="secondary">{Math.round(progress)}% Complete</Badge>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {Object.values(tasks).filter(Boolean).length} of{" "}
              {onboardingTasks.length} completed
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          {onboardingTasks.map((task) => {
            const Icon = task.icon;
            const isChecked = tasks[task.key];

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  isChecked
                    ? "bg-primary/5 border-primary/20"
                    : "bg-background border-border hover:bg-accent/50"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleTaskChange(task.key, checked === true)
                  }
                  id={task.id}
                />
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isChecked ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={task.id}
                      className={cn(
                        "text-sm font-medium cursor-pointer block",
                        isChecked && "text-primary"
                      )}
                    >
                      {task.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <CardFooter className="px-0 pt-6 pb-0">
            <Button
              type="submit"
              disabled={isPending || !hasChanges}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            {hasChanges && !isPending && (
              <p className="text-xs text-muted-foreground ml-4">
                You have unsaved changes
              </p>
            )}
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default OnboardingCard;
