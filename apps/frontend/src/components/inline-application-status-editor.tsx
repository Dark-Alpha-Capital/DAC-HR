import { useTransition, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { updateApplication } from "~/lib/actions/update-application";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import {
  applicationStatuses,
  applicationStatusBadgeVariants,
  applicationStatusLabels,
  isApplicationStatus,
  type ApplicationStatus,
} from "@workspace/db/application-status";

interface InlineApplicationStatusEditorProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
  candidateId?: string;
}

export default function InlineApplicationStatusEditor({
  application,
  candidateId,
}: InlineApplicationStatusEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showHiredDialog, setShowHiredDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(
    null,
  );
  const currentStatus = isApplicationStatus(application.status)
    ? application.status
    : "ai_screening";

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (newStatus === currentStatus) return;

    // If changing to "onboarding" and candidateId is available, show dialog
    if (newStatus === "onboarding" && candidateId) {
      setPendingStatus(newStatus);
      setShowHiredDialog(true);
      return;
    }

    // For other statuses, update directly
    updateStatus(newStatus);
  };

  const updateStatus = (newStatus: ApplicationStatus) => {
    startTransition(async () => {
      const result = await updateApplication({
        data: {
          applicationId: application.id,
          status: newStatus,
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
    });
  };

  const handleAddToEmployeeDirectory = () => {
    setShowHiredDialog(false);
    // Update status first, then redirect
    updateStatus("onboarding");
    // Redirect to employee form with candidate data
    router.navigate({
      to: `/employees/new?candidateId=${candidateId}&applicationId=${application.id}`,
    });
  };

  const handleMarkAsOnboardingOnly = () => {
    setShowHiredDialog(false);
    if (pendingStatus) {
      updateStatus(pendingStatus);
      setPendingStatus(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isPending}>
          <button
            className="flex items-center gap-1 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Change application status"
          >
            <Badge
              variant={applicationStatusBadgeVariants[currentStatus]}
              className="text-xs h-5 cursor-pointer"
            >
              {applicationStatusLabels[currentStatus]}
            </Badge>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {applicationStatuses.map((value) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleStatusChange(value)}
              className="cursor-pointer"
              disabled={value === currentStatus || isPending}
            >
              <div className="flex items-center gap-2 w-full">
                <Badge
                  variant={applicationStatusBadgeVariants[value]}
                  className="text-xs h-5"
                >
                  {applicationStatusLabels[value]}
                </Badge>
                {value === currentStatus && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Current
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showHiredDialog} onOpenChange={setShowHiredDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Employee Directory?</AlertDialogTitle>
            <AlertDialogDescription>
              This candidate has been marked as ONBOARDING. Would you like to
              add them to the DAC Employee Directory? You can fill in additional
              information like their picture and bio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleMarkAsOnboardingOnly}>
              No, Mark as Onboarding
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAddToEmployeeDirectory}>
              Yes, Add to Directory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
