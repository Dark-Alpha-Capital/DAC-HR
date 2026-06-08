import React, { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { authClient } from "@/auth-client";
import { resetCacheForCandidates } from "@/lib/actions/reset-cache";

interface BulkDeleteCandidatesButtonProps {
  selectedIds: string[];
  onDeleteComplete?: () => void;
}

const BulkDeleteCandidatesButton = ({
  selectedIds,
  onDeleteComplete,
}: BulkDeleteCandidatesButtonProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);
  const { data: userSession } = authClient.useSession();

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("No candidates selected", {
        position: "bottom-right",
      });
      return;
    }

    if (!userSession?.session?.token) {
      toast.error("You must be logged in to delete candidates", {
        position: "bottom-right",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/candidate/bulk`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userSession.session.token}`,
          },
          body: JSON.stringify({ candidateIds: selectedIds }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to delete candidates");
        }

        const successCount = result.deleted || 0;
        const failedCount = result.failed || 0;

        if (failedCount === 0) {
          await resetCacheForCandidates();
          toast.success(`Successfully deleted ${successCount} candidate(s)`, {
            position: "bottom-right",
          });
          setOpen(false);
          onDeleteComplete?.();
          router.invalidate();
        } else {
          const errorMessage =
            result.errors && result.errors.length > 0
              ? result.errors.join(", ")
              : "Some deletions failed";
          toast.error(
            `Deleted ${successCount} candidate(s), but ${failedCount} failed: ${errorMessage}`,
            {
              position: "bottom-right",
              duration: 6000,
            },
          );
          setOpen(false);
          onDeleteComplete?.();
          router.invalidate();
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to delete candidates",
          {
            position: "bottom-right",
          },
        );
        setOpen(false);
      }
    });
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          <Trash2 className="h-4 w-4 mr-2" />
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Delete {selectedIds.length} Candidate
          {selectedIds.length !== 1 ? "s" : ""}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {selectedIds.length} candidate(s)?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            {selectedIds.length} candidate{selectedIds.length !== 1 ? "s" : ""}{" "}
            and all related data from the system, including documents and
            applications.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedIds.length} Candidate
                {selectedIds.length !== 1 ? "s" : ""}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDeleteCandidatesButton;
