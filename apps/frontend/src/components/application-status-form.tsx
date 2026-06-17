import { useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { updateApplication } from "~/lib/actions/update-application";
import { toast } from "sonner";
import {
  applicationStatuses,
  applicationStatusDescriptions,
  applicationStatusLabels,
  type ApplicationStatus,
} from "@workspace/db/application-status";

interface ApplicationStatusFormProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
  onSuccess?: () => void;
}

export default function ApplicationStatusForm({
  application,
  onSuccess,
}: ApplicationStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateApplication({
        data: {
          applicationId: application.id,
          status,
        },
      });

      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to update application status",
        );
        return;
      }

      toast.success("Application status updated");
      router.invalidate();
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">Application Status</Label>
        <Select
          value={status}
          onValueChange={(value: ApplicationStatus) => setStatus(value)}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {applicationStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                <div className="flex flex-col">
                  <span>{applicationStatusLabels[value]}</span>
                  <span className="text-xs text-muted-foreground">
                    {applicationStatusDescriptions[value]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSuccess?.()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Status"}
        </Button>
      </div>
    </form>
  );
}
