import { useState, cloneElement, isValidElement } from "react";
import { Button } from "~/components/ui/button";
import { Link2 } from "lucide-react";
import GenerateInterviewLinkDialog from "./generate-interview-link-dialog";

interface GenerateInterviewLinkDialogWrapperProps {
  applicationId: string;
  rounds: Array<{
    id: string;
    name: string;
  }>;
  trigger?: React.ReactNode;
}

export default function GenerateInterviewLinkDialogWrapper({
  applicationId,
  rounds,
  trigger,
}: GenerateInterviewLinkDialogWrapperProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);

  return (
    <>
      {trigger && isValidElement(trigger)
        ? cloneElement(trigger, { onClick: handleOpen } as React.Attributes)
        : trigger || (
            <Button size="sm" variant="secondary" onClick={handleOpen}>
              <Link2 className="h-4 w-4 mr-2" />
              Generate Link
            </Button>
          )}
      <GenerateInterviewLinkDialog
        applicationId={applicationId}
        rounds={rounds}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
