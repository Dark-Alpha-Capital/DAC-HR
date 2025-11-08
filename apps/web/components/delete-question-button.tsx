"use client";

import React, { useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Trash2 } from "lucide-react";
import { deleteQuestion } from "@/lib/actions/delete-question";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DeleteQuestionButton = ({ questionId }: { questionId: string }) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        startTransition(async () => {
          const response = await deleteQuestion(questionId);
          if (response?.error) {
            toast.error(response.error);
          }
          if (response?.success) {
            toast.success("Question deleted successfully");
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

export default DeleteQuestionButton;
