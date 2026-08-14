import React, { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
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
import { useQueryInvalidation } from "~/hooks/use-query-invalidation";
import { bulkDeleteQuestions } from "~/lib/actions/bulk-delete-questions";

interface BulkDeleteQuestionsButtonProps {
  selectedIds: string[];
  onDeleteComplete?: () => void;
}

const BulkDeleteQuestionsButton = ({
  selectedIds,
  onDeleteComplete,
}: BulkDeleteQuestionsButtonProps) => {
  const invalidate = useQueryInvalidation();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = React.useState(false);

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("No questions selected");
      return;
    }

    startTransition(async () => {
      const response = await bulkDeleteQuestions({ data: selectedIds });

      if (response?.error) {
        toast.error(response.error);
        setOpen(false);
        return;
      }

      if (response?.success) {
        toast.success(
          `Successfully deleted ${response.deleted ?? selectedIds.length} question(s)`,
        );
        setOpen(false);
        onDeleteComplete?.();
        void invalidate.questionLists();
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
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Delete {selectedIds.length} Question
          {selectedIds.length !== 1 ? "s" : ""}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {selectedIds.length} question(s)?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            {selectedIds.length} question{selectedIds.length !== 1 ? "s" : ""}{" "}
            and remove them from all associated rounds and positions.
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedIds.length} Question
                {selectedIds.length !== 1 ? "s" : ""}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDeleteQuestionsButton;
