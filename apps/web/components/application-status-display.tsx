import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Edit } from "lucide-react";
import ApplicationStatusForm from "./application-status-form";
import {
  Sparkles,
  Phone,
  Code,
  UserCircle,
  FileText,
  CheckCircle2,
  XCircle,
  UserX,
} from "lucide-react";

type ApplicationStatus =
  | "ai_screening"
  | "first_round_recruiter_call"
  | "second_round_technical_screening"
  | "third_round_final_ceo"
  | "contract_offer"
  | "onboarding"
  | "rejected"
  | "withdrawn";

interface ApplicationStatusDisplayProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
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

const statusIcons: Record<ApplicationStatus, typeof Sparkles> = {
  ai_screening: Sparkles,
  first_round_recruiter_call: Phone,
  second_round_technical_screening: Code,
  third_round_final_ceo: UserCircle,
  contract_offer: FileText,
  onboarding: CheckCircle2,
  rejected: XCircle,
  withdrawn: UserX,
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

export default function ApplicationStatusDisplay({
  application,
}: ApplicationStatusDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const StatusIcon = statusIcons[application.status];

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-5 w-5 text-muted-foreground" />
            <Badge
              variant={statusColors[application.status]}
              className="text-sm font-medium"
            >
              {statusLabels[application.status]}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
            <DialogDescription>
              Change the current status of this application. The status will be
              updated immediately.
            </DialogDescription>
          </DialogHeader>
          <ApplicationStatusForm
            application={application}
            onSuccess={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
