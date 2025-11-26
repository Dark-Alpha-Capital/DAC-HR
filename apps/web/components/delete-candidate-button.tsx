"use client";

import React, { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCandidate } from "@/lib/actions/delete-candidate";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DeleteCandidateButton = ({ candidateId }: { candidateId: string }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        startTransition(async () => {
          const response = await deleteCandidate(candidateId);
          if (response?.error) {
            toast.error(response.error);
          }
          if (response?.success) {
            toast.success("Candidate deleted successfully");
            router.refresh();
          }
        });
      }}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
    </Button>
  );
};

export default DeleteCandidateButton;
