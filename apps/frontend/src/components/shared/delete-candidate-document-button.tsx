import React, { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryInvalidation } from "~/hooks/use-query-invalidation";
import { useAppSession } from "~/hooks/use-app-session";
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
} from "~/components/ui/alert-dialog";

const DeleteCandidateDocumentButton = ({
  documentId,
  candidateId,
}: {
  documentId: string;
  candidateId: string;
}) => {
  const invalidate = useQueryInvalidation();
  const [isPending, startTransition] = useTransition();
  const session = useAppSession();

  const handleDelete = () => {
    if (!session?.user) {
      toast.error("You must be logged in to delete a document", {
        position: "bottom-right",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/candidate/${candidateId}/documents/${documentId}`,
          {
            method: "DELETE",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : typeof result.error === "object"
                ? JSON.stringify(result.error)
                : "Failed to delete document",
            {
              position: "bottom-right",
            },
          );
        } else {
          toast.success("Document deleted successfully", {
            position: "bottom-right",
          });
          void invalidate.candidateDetail(candidateId);
          void invalidate.documentLists();
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete document",
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
          size="icon"
          className="h-7 w-7"
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
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            document from the candidate's record.
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

export default DeleteCandidateDocumentButton;
