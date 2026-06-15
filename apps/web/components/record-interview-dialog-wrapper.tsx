import { useState, cloneElement, isValidElement } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RecordInterviewDialog from "./record-interview-dialog";

interface RecordInterviewDialogWrapperProps {
  applicationId: string;
  application: {
    rounds: Array<{
      id: string;
      name: string;
      positionRoundTemplateId: string;
    }>;
  };
  users: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  currentUserId: string;
  trigger?: React.ReactNode;
  positionRoundTemplateId?: string;
}

export default function RecordInterviewDialogWrapper({
  applicationId,
  application,
  users,
  currentUserId,
  trigger,
  positionRoundTemplateId,
}: RecordInterviewDialogWrapperProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);

  return (
    <>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger, { onClick: handleOpen } as any)
        : trigger || (
            <Button size="sm" onClick={handleOpen}>
              <Plus className="h-3 w-3 mr-2" />
              Record Interview
            </Button>
          )}
      <RecordInterviewDialog
        applicationId={applicationId}
        application={application}
        users={users}
        currentUserId={currentUserId}
        open={open}
        onOpenChange={setOpen}
        initialPositionRoundTemplateId={positionRoundTemplateId}
      />
    </>
  );
}
