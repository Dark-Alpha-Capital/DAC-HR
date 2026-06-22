import React, { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deletePosition } from "~/lib/actions/delete-position";
import { toast } from "sonner";
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

const DeletePositionButton = ({ positionId }: { positionId: string }) => {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const response = await deletePosition({ data: positionId });

      if (response?.error) {
        toast.error(response.error);
      }

      if (response?.success) {
        toast.success("Position deleted successfully");
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
              disabled={isPending}
              className="h-7 w-7 p-0"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">Delete position</span>
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete position?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              position from the system and it will no longer be available to
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

export default DeletePositionButton;
