"use client";

import React, { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteEmployee } from "@/lib/actions/delete-employee";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DeleteEmployeeButton = ({
  employeeId,
}: {
  employeeId: string;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        startTransition(async () => {
          const response = await deleteEmployee(employeeId);
          if (response?.error) {
            toast.error(response.error);
          }
          if (response?.success) {
            toast.success("Employee deleted successfully");
            router.refresh();
          }
        });
      }}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
    </Button>
  );
};

export default DeleteEmployeeButton;

