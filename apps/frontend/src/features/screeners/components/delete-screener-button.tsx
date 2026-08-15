import { useTransition } from "react";
import { Button } from "#/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteScreenerAction } from "#/features/screeners/server/mutations/delete-screener";
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
} from "#/components/ui/alert-dialog";

export default function DeleteScreenerButton({
  screenerId,
}: {
  screenerId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <AlertDialog>
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
          <span className="sr-only">Delete screener</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete screener?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Existing interview analyses that used
            this screener will keep their results but lose the screener link.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              startTransition(async () => {
                const response = await deleteScreenerAction({ data: screenerId });
                if (response?.error) {
                  toast.error(response.error || "Failed to delete screener");
                }
                if (response?.success) {
                  toast.success("Screener deleted");
                  router.navigate({ to: "/screeners" });
                }
              });
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
