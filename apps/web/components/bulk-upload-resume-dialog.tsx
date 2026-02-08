"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const MAX_FILES = 50;
const MAX_SIZE_MB = 10;

export type PositionOption = { id: string; name: string };

export default function BulkUploadResumeDialog({
  positions = [],
}: {
  positions?: PositionOption[];
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [positionId, setPositionId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [fileInputKey, setFileInputKey] = useState(0);

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExtensions = [".pdf", ".doc", ".docx"];

  const isValidFile = (file: File): boolean => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const typeOk =
      allowedTypes.includes(file.type) || allowedExtensions.includes(ext);
    const sizeOk = file.size <= MAX_SIZE_MB * 1024 * 1024;
    return typeOk && sizeOk;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    const next: File[] = [];
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      if (f && isValidFile(f)) next.push(f);
      else if (f) {
        toast.error(
          `"${f.name}" skipped: only PDF, .doc, .docx up to ${MAX_SIZE_MB}MB`,
          { position: "bottom-right" }
        );
      }
    }
    setFiles((prev) => {
      const combined = [...prev, ...next];
      return combined.length > MAX_FILES
        ? combined.slice(0, MAX_FILES)
        : combined;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetDialog = () => {
    setFiles([]);
    setPositionId("");
    setFileInputKey((k) => k + 1);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetDialog();
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      toast.error("Select at least one file.", { position: "bottom-right" });
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        for (const f of files) {
          formData.append("files", f);
        }
        if (positionId) formData.append("positionId", positionId);

        const res = await fetch("/api/candidates/bulk-resume", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          toast.error(data?.error ?? "Upload failed", {
            position: "bottom-right",
          });
          return;
        }

        toast.success(
          `${files.length} resume(s) queued. You can track progress below.`,
          { position: "bottom-right" }
        );
        setOpen(false);
        resetDialog();
        router.push(`/candidates/bulk-resume-uploads/${data.batchId}` as never);
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Failed to upload resumes",
          { position: "bottom-right" }
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <FileText className="mr-2 h-4 w-4" />
          Bulk Upload Resumes
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg sm:w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Upload Resumes</DialogTitle>
          <DialogDescription>
            Upload multiple resumes (PDF, .doc, .docx). Each file will be
            processed by AI to extract candidate info and saved. Max {MAX_FILES}{" "}
            files, {MAX_SIZE_MB}MB each.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden">
          {positions.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Position (optional)</label>
              <Select
                value={positionId || "none"}
                onValueChange={(v) => setPositionId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No position</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Resume files</label>
              {files.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={isPending}
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              ) : null}
            </div>
            <Input
              key={fileInputKey}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={isPending}
            />
          </div>

          {files.length > 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>{files.length} file(s) selected</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside text-sm max-h-32 overflow-y-auto">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-2"
                    >
                      <span className="truncate flex-1">{f.name}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(i)}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || files.length === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Upload {files.length > 0 ? files.length : ""} Resume
                {files.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
