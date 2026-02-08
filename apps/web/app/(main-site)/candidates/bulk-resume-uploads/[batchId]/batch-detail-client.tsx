"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BulkResumeUploadBatch, BulkResumeUploadJob } from "@workspace/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type Props = {
  batchId: string;
  initialBatch: BulkResumeUploadBatch;
  initialJobs: BulkResumeUploadJob[];
  isComplete: boolean;
};

export default function BatchDetailClient({
  batchId,
  initialBatch,
  initialJobs,
  isComplete,
}: Props) {
  const [batch, setBatch] = useState(initialBatch);
  const [jobs, setJobs] = useState(initialJobs);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/candidates/bulk-resume-uploads/${batchId}`,
          { credentials: "include" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.batch) setBatch(data.batch);
        if (data.jobs) setJobs(data.jobs);
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [batchId, isComplete]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold">{batch.totalCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-semibold text-green-600">
            {batch.completedCount}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-semibold text-destructive">
            {batch.failedCount}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="text-lg font-medium capitalize">{batch.status}</p>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead className="max-w-[200px]">Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-mono text-muted-foreground">
                  {j.jobIndex + 1}
                </TableCell>
                <TableCell className="font-medium">{j.fileName}</TableCell>
                <TableCell>
                  <span
                    className={
                      j.status === "completed"
                        ? "text-green-600"
                        : j.status === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {j.status}
                  </span>
                </TableCell>
                <TableCell>
                  {j.candidateId ? (
                    <Link
                      href={`/candidates/${j.candidateId}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm text-destructive truncate max-w-[200px]">
                  {j.errorMessage ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
