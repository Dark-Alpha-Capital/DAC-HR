"use client";

import React, { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { deletePosition } from "@/lib/actions/delete-position";
import { toast } from "sonner";

const DeletePositionButton = ({ positionId }: { positionId: string }) => {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        startTransition(async () => {
          const response = await deletePosition(positionId);
          if (response?.error) {
            toast.error(response.error);
          }
          if (response?.success) {
            toast.success("Position deleted successfully");
          }
        });
      }}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="sr-only">Delete</span>
      )}
    </Button>
  );
};

export default DeletePositionButton;
