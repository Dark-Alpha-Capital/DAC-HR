import React, { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteRound } from "~/lib/actions/delete-round";
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

const DeleteRoundButton = ({
  roundId,
  onDeleted,
}: {
  roundId: string;
  onDeleted?: () => void | Promise<void>;
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
              <span className="sr-only">Delete round</span>
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete round?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              round and it will be removed from all associated positions and
              questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                startTransition(async () => {
                  const response = await deleteRound({ data: roundId });
                  if (response?.error) {
                    toast.error(response.error);
                    return;
                  }
                  if (response?.success) {
                    toast.success("Round deleted successfully");
                    if (onDeleted) {
                      await onDeleted();
                    } else {
                      router.navigate({ to: "/rounds", search: {} as any });
                    }
                  }
                });
              }}
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

export default DeleteRoundButton;
