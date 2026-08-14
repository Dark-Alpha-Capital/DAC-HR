import React, { useTransition, useState } from "react";
import { Button } from "#/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteEmployee } from "#/features/employees/server/mutations/delete-employee";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";
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

const DeleteEmployeeButton = ({ employeeId }: { employeeId: string }) => {
  const router = useRouter();
  const invalidate = useQueryInvalidation();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    startTransition(async () => {
      const response = await deleteEmployee({ data: employeeId });
      if (response?.error) {
        toast.error(response.error);
        setOpen(false);
      }
      if (response?.success) {
        toast.success("Employee deleted successfully");
        setOpen(false);
        void invalidate.employeeDetail(employeeId);
        router.navigate({ to: "/employees", search: {} as any });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Employee</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this employee? This action cannot be
            undone and will permanently remove the employee from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEmployeeButton;
