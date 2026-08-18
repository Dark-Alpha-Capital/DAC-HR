import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { ApplicationDetailView } from "#/features/applications/components/application-detail-view";

interface ApplicationDetailSheetProps {
  applicationId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplicationDetailSheet({
  applicationId,
  open,
  onOpenChange,
}: ApplicationDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-[92vw] max-w-none flex-col gap-0 p-0 sm:w-[82vw] lg:w-[72vw]"
      >
        <SheetHeader className="shrink-0 space-y-1.5 border-b px-6 pt-6 pb-5">
          <SheetTitle>Application details</SheetTitle>
          <SheetDescription>
            Review application progress without leaving the candidate page.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {applicationId ? (
            <ApplicationDetailView
              applicationId={applicationId}
              layout="embedded"
            />
          ) : null}
        </div>

        {applicationId ? (
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button asChild variant="secondary">
              <Link to="/applications/$id" params={{ id: applicationId }}>
                Open full page
              </Link>
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
