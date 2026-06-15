import React, { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { deleteCandidate } from "@/lib/actions/delete-candidate";
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
} from "@/components/ui/alert-dialog";
import { resetCacheForCandidates } from "@/lib/actions/reset-cache";
import { useAppSession } from "@/hooks/use-app-session";

const DeleteCandidateButton = ({ candidateId }: { candidateId: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const session = useAppSession();

  const handleDelete = () => {
    if (!session?.user) {
      toast.error("You must be logged in to delete a candidate", {
        position: "bottom-right",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/candidate/${candidateId}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to delete candidate");
        }

        await resetCacheForCandidates();
        toast.success("Candidate deleted successfully", {
          position: "bottom-right",
        });
        router.invalidate();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete candidate",
          {
            position: "bottom-right",
          },
        );
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            candidate and all related data from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCandidateButton;
