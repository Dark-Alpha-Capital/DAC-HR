"use client";

import React, { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteRound } from "@/lib/actions/delete-round";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DeleteRoundButton = ({ roundId }: { roundId: string }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        startTransition(async () => {
          const response = await deleteRound(roundId);
          if (response?.error) {
            toast.error(response.error);
          }
          if (response?.success) {
            toast.success("Round deleted successfully");
            router.push("/rounds");
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

export default DeleteRoundButton;
