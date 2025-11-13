"use client";

import React, { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCandidateDocument } from "@/lib/actions/delete-candidate-document";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DeleteCandidateDocumentButton = ({
  documentId,
  candidateId,
}: {
  documentId: string;
  candidateId: string;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        startTransition(async () => {
          const response = await deleteCandidateDocument(documentId, candidateId);
          if (response?.error) {
            toast.error(
              typeof response.error === "string"
                ? response.error
                : "Failed to delete document",
              {
                position: "bottom-right",
              }
            );
          }
          if (response?.success) {
            toast.success("Document deleted successfully", {
              position: "bottom-right",
            });
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

export default DeleteCandidateDocumentButton;

