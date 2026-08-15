import React, { useState, useMemo, useTransition } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { updateOnboardingTasks } from "#/features/candidates/server/mutations/onboarding";
import { updateChecklistItems } from "#/features/candidates/server/mutations/checklist";
import { toast } from "sonner";
import {
  FileSignature,
  Mail,
  Package,
  MailCheck,
  Save,
  Loader2,
  Plus,
  X,
  CircleDot,
} from "lucide-react";
import { cn } from "#/lib/utils";

type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

type OnboardingCardProps = {
  candidateId: string;
  onboardingData: {
    contractSigned: boolean;
    emailProvided: boolean;
    onboardingPacketSent: boolean;
    companyEmailActivate: boolean;
  };
  checklistItems?: ChecklistItem[];
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
    id: "emailProvided",
    label: "Welcome Email Sent",
    description: "Registration and welcome email has been sent",
    icon: Mail,
    key: "emailProvided" as const,
  },
  {
    id: "onboardingPacketSent",
    label: "Onboarding Packet Sent",
    description: "Onboarding documentation packet has been delivered",
    icon: Package,
    key: "onboardingPacketSent" as const,
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
  checklistItems = [],
}) => {
  const [tasks, setTasks] = useState({
    contractSigned: onboardingData.contractSigned,
    emailProvided: onboardingData.emailProvided,
    onboardingPacketSent: onboardingData.onboardingPacketSent,
    companyEmailActivate: onboardingData.companyEmailActivate,
  });
  const [customItems, setCustomItems] =
    useState<ChecklistItem[]>(checklistItems);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalItems = onboardingTasks.length + customItems.length;

  const progress = useMemo(() => {
    const completed =
      Object.values(tasks).filter(Boolean).length +
      customItems.filter((item) => item.checked).length;
    return totalItems > 0 ? (completed / totalItems) * 100 : 0;
  }, [tasks, customItems, totalItems]);

  const { presetChanged, customChanged } = useMemo(() => {
    const presetChanged =
      tasks.contractSigned !== onboardingData.contractSigned ||
      tasks.emailProvided !== onboardingData.emailProvided ||
      tasks.onboardingPacketSent !== onboardingData.onboardingPacketSent ||
      tasks.companyEmailActivate !== onboardingData.companyEmailActivate;
    const customChanged =
      customItems.length !== checklistItems.length ||
      customItems.some(
        (item, index) =>
          checklistItems[index]?.id !== item.id ||
          checklistItems[index]?.label !== item.label ||
          checklistItems[index]?.checked !== item.checked,
      );
    return { presetChanged, customChanged };
  }, [tasks, customItems, checklistItems]);

  const hasChanges = presetChanged || customChanged;

  const handleTaskChange = (key: keyof typeof tasks, checked: boolean) => {
    setTasks((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleCustomToggle = (id: string, checked: boolean) => {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item)),
    );
  };

  const handleAddCustom = () => {
    const label = newItemLabel.trim();
    if (!label) {
      return;
    }
    setCustomItems((prev) => [...prev, { id: "", label, checked: false }]);
    setNewItemLabel("");
  };

  const handleDeleteCustom = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
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
        const result = await updateOnboardingTasks({
          data: [candidateId, tasks],
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to update tasks");
        }

        if (customChanged) {
          const customResult = await updateChecklistItems({
            data: [
              candidateId,
              customItems.map((item) => ({
                id: item.id || undefined,
                label: item.label,
                checked: item.checked,
              })),
            ],
          });
          if (!customResult.success) {
            throw new Error(customResult.error || "Failed to update checklist");
          }
        }

        toast.success("Checklist updated successfully", {
          position: "bottom-right",
          description: "All changes have been saved.",
        });
      } catch (err) {
        console.error("Error saving checklist tasks", err);
        toast.error("Failed to update checklist", {
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
          <h3 className="text-sm font-semibold">Checklist</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {Object.values(tasks).filter(Boolean).length +
              customItems.filter((item) => item.checked).length}{" "}
            of {totalItems} completed
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
                isChecked && "opacity-60",
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
                  isChecked ? "text-primary" : "text-muted-foreground",
                )}
              />
              <label
                htmlFor={task.id}
                className={cn(
                  "text-sm cursor-pointer flex-1",
                  isChecked && "text-muted-foreground line-through",
                )}
              >
                {task.label}
              </label>
            </div>
          );
        })}

        {customItems.map((item, index) => (
          <div
            key={item.id || `new-${index}`}
            className={cn(
              "flex items-center gap-2.5 py-2 transition-colors",
              item.checked && "opacity-60",
            )}
          >
            <Checkbox
              checked={item.checked}
              onCheckedChange={(checked) =>
                handleCustomToggle(item.id, checked === true)
              }
              id={`custom-${item.label}`}
              className="h-4 w-4"
            />
            <CircleDot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <label
              htmlFor={`custom-${item.label}`}
              className={cn(
                "text-sm cursor-pointer flex-1",
                item.checked && "text-muted-foreground line-through",
              )}
            >
              {item.label}
            </label>
            <button
              type="button"
              onClick={() => handleDeleteCustom(item.id)}
              aria-label={`Delete ${item.label}`}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2">
          <Input
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="Add an item…"
            className="h-8 flex-1 text-sm"
            aria-label="New checklist item"
          />
          <Button
            type="button"
            onClick={handleAddCustom}
            disabled={!newItemLabel.trim()}
            size="sm"
            variant="secondary"
            className="h-8"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Other
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            type="submit"
            disabled={isPending || !hasChanges}
            size="sm"
            variant="secondary"
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
