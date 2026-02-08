import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getBulkResumeBatchById,
  getBulkResumeJobsByBatchId,
} from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import BatchDetailClient from "./batch-detail-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk Resume Upload",
  description: "Batch progress and job status",
};

export default async function BulkResumeBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const [batch, jobs] = await Promise.all([
    getBulkResumeBatchById(batchId),
    getBulkResumeJobsByBatchId(batchId),
  ]);

  if (!batch) notFound();
  if (batch.userId !== session.user.id) notFound();

  const isComplete =
    batch.status === "completed" || batch.status === "partial";

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/candidates/bulk-resume-uploads">← Back to list</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight mt-2">
            Batch {batchId.slice(0, 8)}…
          </h1>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/candidates">Candidates</Link>
        </Button>
      </div>

      <BatchDetailClient
        batchId={batchId}
        initialBatch={batch}
        initialJobs={jobs}
        isComplete={isComplete}
      />
    </div>
  );
}
