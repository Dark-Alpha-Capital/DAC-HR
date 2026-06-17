import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Edit } from "lucide-react";
import ApplicationStatusForm from "./application-status-form";
import {
  Sparkles,
  Phone,
  Code,
  FileText,
  Handshake,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  applicationStatusBadgeVariants,
  applicationStatusLabels,
  isApplicationStatus,
  type ApplicationStatus,
} from "@workspace/db/application-status";

interface ApplicationStatusDisplayProps {
  application: {
    id: string;
    status: ApplicationStatus;
  };
}

const statusIcons: Record<ApplicationStatus, typeof Sparkles> = {
  ai_screening: Sparkles,
  first_round: Phone,
  offer_agreement: Handshake,
  technical_round: Code,
  contract_offer: FileText,
  onboarding: CheckCircle2,
  rejected: XCircle,
};

export default function ApplicationStatusDisplay({
  application,
}: ApplicationStatusDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = isApplicationStatus(application.status)
    ? application.status
    : "ai_screening";
  const StatusIcon = statusIcons[status];

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className="h-5 w-5 text-muted-foreground" />
            <Badge
              variant={applicationStatusBadgeVariants[status]}
              className="text-sm font-medium"
            >
              {applicationStatusLabels[status]}
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
            application={{ ...application, status }}
            onSuccess={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
