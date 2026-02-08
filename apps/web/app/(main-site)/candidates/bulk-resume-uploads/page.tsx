import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getBulkResumeBatchesByUserId } from "@workspace/db/queries";
import { Button } from "@workspace/ui/components/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bulk Resume Uploads",
  description: "Track bulk resume upload batches",
};

export default async function BulkResumeUploadsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }

  const batches = await getBulkResumeBatchesByUserId(session.user.id);

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bulk Resume Uploads
        </h1>
        <Button asChild variant="secondary" size="sm">
          <Link href="/candidates">Back to Candidates</Link>
        </Button>
      </div>

      {batches.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <p>No bulk upload batches yet.</p>
          <Button asChild className="mt-4">
            <Link href="/candidates">Upload Resumes</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {batches.map((b) => (
            <li key={b.id}>
              <Link
                href={{
                  pathname: "/candidates/bulk-resume-uploads/[batchId]",
                  query: { batchId: b.id },
                }}
                className="block rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {b.totalCount} resume{b.totalCount !== 1 ? "s" : ""} ·{" "}
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                  <span
                    className={`text-sm ${
                      b.status === "completed"
                        ? "text-green-600"
                        : b.status === "partial"
                          ? "text-amber-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {b.completedCount} completed, {b.failedCount} failed
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
