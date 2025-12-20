"use client";

import React, { useState, useMemo, useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Onboarding Tasks</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {Object.values(tasks).filter(Boolean).length} of{" "}
            {onboardingTasks.length} completed
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(progress)}%
        </div>
      </div>

      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {onboardingTasks.map((task) => {
          const Icon = task.icon;
          const isChecked = tasks[task.key];

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2.5 py-2 transition-colors",
                isChecked && "opacity-60"
              )}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) =>
                  handleTaskChange(task.key, checked === true)
                }
                id={task.id}
                className="h-4 w-4"
              />
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isChecked ? "text-primary" : "text-muted-foreground"
                )}
              />
              <label
                htmlFor={task.id}
                className={cn(
                  "text-sm cursor-pointer flex-1",
                  isChecked && "text-muted-foreground line-through"
                )}
              >
                {task.label}
              </label>
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="submit"
            disabled={isPending || !hasChanges}
            size="sm"
            variant="outline"
            className="h-8"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
          {hasChanges && !isPending && (
            <span className="text-xs text-muted-foreground">
              Unsaved changes
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

export default OnboardingCard;
