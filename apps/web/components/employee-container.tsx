import React, { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import { Link, useRouter } from "@tanstack/react-router";
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { deleteEmployee } from "@/lib/actions/delete-employee";
import { toast } from "sonner";
import type { Employee } from "@workspace/db/schema";
import { formatDepartments } from "@/lib/utils";
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

type EmployeeWithPosition = Employee & {
  position: { id: string; name: string; slug: string } | null;
};

interface EmployeeContainerProps {
  employees: EmployeeWithPosition[];
}

const DeleteEmployeeIconButton = ({ employeeId }: { employeeId: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    startTransition(async () => {
      const response = await deleteEmployee(employeeId);
      if (response?.error) {
        toast.error(response.error);
        setOpen(false);
      }
      if (response?.success) {
        toast.success("Employee deleted successfully");
        setOpen(false);
        router.invalidate();
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
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

const EmployeeContainer = ({ employees }: EmployeeContainerProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Department</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Position</TableHead>
          <TableHead className="text-right py-1.5 px-2 text-xs">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee, index) => {
          const fullName = `${employee.firstName} ${employee.lastName}`;
          const departmentNames = formatDepartments(employee.department);
          return (
            <TableRow key={employee.id}>
              <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="py-1.5 px-2 font-medium text-sm">
                {fullName}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {departmentNames.join(", ")}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {employee.positionId ? (
                  <Link
                    to="/positions/$slug"
                    params={{ slug: employee.position!.slug }}
                  >
                    {employee.position?.name}
                  </Link>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right py-1.5 px-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    asChild
                  >
                    <Link to="/employees/$id" params={{ id: employee.id }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    asChild
                  >
                    <Link
                      to="/employees/$id/edit"
                      params={{ id: employee.id }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <DeleteEmployeeIconButton employeeId={employee.id} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default EmployeeContainer;
