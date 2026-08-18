import { useState, cloneElement, isValidElement } from "react";
import type { ReactElement } from "react";
import { Button } from "#/components/ui/button";
import { Plus } from "lucide-react";
import RecordInterviewDialog from "./record-interview-dialog";
import type { ApplicationDetail } from "#/features/applications/types";

interface RecordInterviewDialogWrapperProps {
  applicationId: string;
  application: Pick<ApplicationDetail, "rounds">;
  candidateEmail?: string | null;
  users: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  currentUserId: string;
  trigger?: React.ReactNode;
  roundId?: string;
  positionSlug?: string;
}

export default function RecordInterviewDialogWrapper({
  applicationId,
  application,
  candidateEmail,
  users,
  currentUserId,
  trigger,
  roundId,
  positionSlug,
}: RecordInterviewDialogWrapperProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);

  return (
    <>
      {trigger && isValidElement(trigger)
        ? // SAFETY: the wrapper contract injects an `onClick` opener onto the
          // supplied trigger element, which is expected to accept it.
          cloneElement(
            trigger as ReactElement<{ onClick?: () => void }>,
            { onClick: handleOpen },
          )
        : trigger || (
            <Button size="sm" onClick={handleOpen}>
              <Plus className="h-3 w-3 mr-2" />
              Record Interview
            </Button>
          )}
      <RecordInterviewDialog
        applicationId={applicationId}
        application={application}
        candidateEmail={candidateEmail}
        users={users}
        currentUserId={currentUserId}
        open={open}
        onOpenChange={setOpen}
        initialRoundId={roundId}
        positionSlug={positionSlug}
      />
    </>
  );
}
