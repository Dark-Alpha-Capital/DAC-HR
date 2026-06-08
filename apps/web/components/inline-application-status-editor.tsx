import { useTransition, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { updateApplication } from "@/lib/actions/update-application";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

type ApplicationStatus =
  | "ai_screening"
  | "first_round_recruiter_call"
  | "second_round_technical_screening"
  | "third_round_final_ceo"
  | "contract_offer"
  | "onboarding"
  | "rejected"
  | "withdrawn";

interface InlineApplicationStatusEditorProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
  candidateId?: string;
}

const statusLabels: Record<ApplicationStatus, string> = {
  ai_screening: "AI Screening",
  first_round_recruiter_call: "1st Round Recruiter Call",
  second_round_technical_screening: "2nd Round Technical Screening",
  third_round_final_ceo: "3rd Round Final Round with CEO",
  contract_offer: "Contract/Offer",
  onboarding: "Onboarding",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const statusColors: Record<
  ApplicationStatus,
  "default" | "secondary" | "destructive"
> = {
  ai_screening: "secondary",
  first_round_recruiter_call: "default",
  second_round_technical_screening: "default",
  third_round_final_ceo: "default",
  contract_offer: "default",
  onboarding: "default",
  rejected: "destructive",
  withdrawn: "secondary",
};

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

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    if (newStatus === application.status) return;

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
        applicationId: application.id,
        status: newStatus,
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
              variant={statusColors[application.status]}
              className="text-xs h-5 cursor-pointer"
            >
              {statusLabels[application.status]}
            </Badge>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {Object.entries(statusLabels).map(([value, label]) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleStatusChange(value as ApplicationStatus)}
              className="cursor-pointer"
              disabled={value === application.status || isPending}
            >
              <div className="flex items-center gap-2 w-full">
                <Badge
                  variant={statusColors[value as ApplicationStatus]}
                  className="text-xs h-5"
                >
                  {label}
                </Badge>
                {value === application.status && (
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
