import React, { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteQuestion } from "~/lib/actions/delete-question";
import { toast } from "sonner";
import { useQueryInvalidation } from "~/hooks/use-query-invalidation";
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

const DeleteQuestionButton = ({ questionId }: { questionId: string }) => {
  const [isPending, startTransition] = useTransition();
  const invalidate = useQueryInvalidation();

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
              <span className="sr-only">Delete question</span>
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              question and it will be removed from all associated rounds and
              positions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                startTransition(async () => {
                  const response = await deleteQuestion({ data: questionId });
                  if (response?.error) {
                    toast.error(response.error);
                  }
                  if (response?.success) {
                    toast.success("Question deleted successfully");
                    void invalidate.questionLists();
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

export default DeleteQuestionButton;
