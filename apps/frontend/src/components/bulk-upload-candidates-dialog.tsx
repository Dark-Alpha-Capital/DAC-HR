import { useEffect, useRef, useState, useTransition } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Progress } from "~/components/ui/progress";
import { useQueryInvalidation } from "~/hooks/use-query-invalidation";
import { queryKeys } from "~/lib/query/query-keys";

type ImportStatus = {
  import: {
    id: string;
    status: string;
    filename: string;
    type: string;
    totalCandidates: number;
    processedCandidates: number;
    failedCandidates: number;
    error?: string | null;
  };
  summary: {
    total: number;
    processed: number;
    failed: number;
    skipped: number;
    succeeded: number;
  };
  rows: Array<{
    rowIndex: number;
    status: string;
    error?: string | null;
  }>;
};

const TERMINAL_IMPORT_STATUSES = new Set(["completed", "failed", "cancelled"]);

function importStatusQueryOptions(importId: string) {
  return queryOptions({
    queryKey: queryKeys.imports.status(importId),
    queryFn: async (): Promise<ImportStatus> => {
      const response = await fetch(`/api/candidate/import/${importId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch import status");
      }
      return response.json();
    },
  });
}

type PositionOption = {
  id: string;
  name: string;
};

type BulkUploadCandidatesDialogProps = {
  positions?: PositionOption[];
};

const ACCEPTED_EXTENSIONS = [".csv", ".zip"];

export default function BulkUploadCandidatesDialog({
  positions = [],
}: BulkUploadCandidatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [positionId, setPositionId] = useState<string>("");
  const [importId, setImportId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();
  const [fileInputKey, setFileInputKey] = useState(0);
  const invalidate = useQueryInvalidation();
  const hasNotifiedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: status, refetch: refetchStatus } = useQuery({
    ...importStatusQueryOptions(importId ?? ""),
    enabled: Boolean(importId) && open,
    refetchInterval: (query) => {
      const importStatus = (query.state.data as ImportStatus | undefined)?.import
        .status;
      if (!importStatus || TERMINAL_IMPORT_STATUSES.has(importStatus)) {
        return false;
      }
      return 2000;
    },
  });

  useEffect(() => {
    if (!importId || !open) {
      hasNotifiedRef.current = false;
      return;
    }

    if (!status) {
      return;
    }

    if (status.import.status === "completed" && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      toast.success(
        `Import complete: ${status.summary.succeeded} created, ${status.summary.skipped} skipped, ${status.summary.failed} failed`,
      );
      void invalidate.candidateLists();
      void invalidate.applicationLists();
      return;
    }

    if (status.import.status === "failed" && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      toast.error(status.import.error ?? "Import failed");
      return;
    }

    if (status.import.status === "cancelled" && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      toast.info("Import cancelled");
      void invalidate.candidateLists();
      void invalidate.applicationLists();
    }
  }, [status, importId, open, invalidate]);

  const reset = () => {
    setFile(null);
    setImportId(null);
    setPositionId("");
    setFileInputKey((key) => key + 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const extension = selected.name
      .toLowerCase()
      .substring(selected.name.lastIndexOf("."));

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast.error("Please upload a CSV or ZIP file");
      return;
    }

    setFile(selected);
    setImportId(null);
    hasNotifiedRef.current = false;
  };

  const handleUpload = () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (positionId) {
          formData.append("positionId", positionId);
        }

        const response = await fetch("/api/candidate/import", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          importId?: string;
          error?: string;
        };

        if (!response.ok) {
          toast.error(data.error ?? "Upload failed");
          return;
        }

        if (!data.importId) {
          toast.error("Import job was not created");
          return;
        }

        hasNotifiedRef.current = false;
        setImportId(data.importId);
        toast.success("Import started. Processing in background...");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to start import",
        );
      }
    });
  };

  const handleStopImport = () => {
    if (!importId) return;

    startCancelTransition(async () => {
      try {
        const response = await fetch(`/api/candidate/import/${importId}`, {
          method: "DELETE",
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          toast.error(data.error ?? "Failed to cancel import");
          return;
        }

        toast.success("Import stopped");
        hasNotifiedRef.current = true;
        await refetchStatus();
        void invalidate.candidateLists();
        void invalidate.applicationLists();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to cancel import",
        );
      }
    });
  };

  const isProcessing =
    importId !== null &&
    status?.import.status !== "completed" &&
    status?.import.status !== "failed" &&
    status?.import.status !== "cancelled";

  const progressPercent =
    status && status.import.totalCandidates > 0
      ? Math.round(
          (status.import.processedCandidates / status.import.totalCandidates) *
            100,
        )
      : isProcessing
        ? 10
        : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && status?.import.status === "completed") {
          void invalidate.candidateLists();
          void invalidate.applicationLists();
        }
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" className="shrink-0">
          <Upload className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">Bulk Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90dvh,40rem)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1.5 px-4 pt-4 pr-12">
          <DialogTitle>Bulk Upload Candidates</DialogTitle>
          <DialogDescription className="text-pretty">
            Upload a CSV or ZIP of resumes. Files are processed on the server —
            nothing is parsed in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-1">
          {positions.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="bulk-upload-position">Position (optional)</Label>
              <Select
                value={positionId || "none"}
                onValueChange={(value) =>
                  setPositionId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="bulk-upload-position" className="w-full min-w-0">
                  <SelectValue placeholder="No position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No position</SelectItem>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="bulk-upload-file">File</Label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
                disabled={isPending || isProcessing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4 shrink-0" />
                Choose file
              </Button>
              <Input
                ref={fileInputRef}
                key={fileInputKey}
                id="bulk-upload-file"
                type="file"
                accept=".csv,.zip"
                onChange={handleFileChange}
                disabled={isPending || isProcessing}
                className="sr-only"
              />
              {!file ? (
                <p className="min-w-0 text-sm text-muted-foreground sm:flex-1">
                  CSV or ZIP
                </p>
              ) : null}
            </div>
            {file ? (
              <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate" title={file.name}>
                  {file.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    setFile(null);
                    setFileInputKey((key) => key + 1);
                  }}
                  disabled={isPending || isProcessing}
                  aria-label="Remove selected file"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>

          {isProcessing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span className="min-w-0">Processing import...</span>
              </div>
              <Progress value={progressPercent} className="w-full" />
              {status ? (
                <p className="text-xs text-muted-foreground">
                  {status.import.processedCandidates} /{" "}
                  {status.import.totalCandidates || "…"} processed
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleStopImport}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  "Stop import"
                )}
              </Button>
            </div>
          ) : null}

          {status?.import.status === "completed" ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                {status.summary.succeeded} created, {status.summary.skipped}{" "}
                skipped, {status.summary.failed} failed.
              </AlertDescription>
            </Alert>
          ) : null}

          {status?.import.status === "failed" ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>
                {status.import.error ?? "An unknown error occurred"}
              </AlertDescription>
            </Alert>
          ) : null}

          {status?.import.status === "cancelled" ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import cancelled</AlertTitle>
              <AlertDescription>
                Processing was stopped. Any candidates created before cancellation
                are still saved.
              </AlertDescription>
            </Alert>
          ) : null}

          {status && status.rows.some((row) => row.error) ? (
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-xs">
              {status.rows
                .filter((row) => row.error)
                .slice(0, 10)
                .map((row) => (
                  <div key={row.rowIndex} className="text-muted-foreground">
                    Row {row.rowIndex}: {row.error}
                  </div>
                ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending || isCancelling}
          >
            {status?.import.status === "completed" ||
            status?.import.status === "cancelled"
              ? "Close"
              : isProcessing
                ? "Close"
                : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isPending || isProcessing || isCancelling}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Start Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
