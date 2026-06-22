import React, { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteDocument } from "~/lib/actions/delete-document";
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
} from "~/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

const DeleteDocumentButton = ({ documentId }: { documentId: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const response = await deleteDocument({ data: documentId });

      if (response?.error) {
        toast.error(response.error);
      }

      if (response?.success) {
        toast.success("Document deleted successfully");
        router.invalidate();
      }
    });
  };

  return (
    <Tooltip>
      <AlertDialog>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              document from the system and it will no longer be available to
              anyone.
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
      <TooltipContent>Delete</TooltipContent>
    </Tooltip>
  );
};

export default DeleteDocumentButton;
