import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import {
  getBulkResumeBatchById,
  getBulkResumeJobsByBatchId,
} from "@workspace/db/queries";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ batchId: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { user } = authResult;

  const { batchId } = await context.params;
  if (!batchId) {
    return NextResponse.json({ error: "batchId required" }, { status: 400 });
  }

  const batch = await getBulkResumeBatchById(batchId);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }
  if (batch.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await getBulkResumeJobsByBatchId(batchId);
  return NextResponse.json({ batch, jobs });
}
