"use client";

import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import CandidateDocumentUploadForm from "~/components/forms/candidate-document-upload-form";

interface CandidateAddDocumentDialogProps {
  candidateId: string;
  variant?: "header" | "empty-state";
}

export function CandidateAddDocumentDialog({
  candidateId,
  variant = "header",
}: CandidateAddDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    void router.invalidate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "empty-state" ? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        ) : (
          <Button variant="secondary" size="sm">
            Add Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a file and add details for this candidate.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[min(65vh,520px)]">
          <div className="px-4 pb-4">
            <CandidateDocumentUploadForm
              candidateId={candidateId}
              compact
              onSuccess={handleSuccess}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
