import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { uploadFileToNextCloudWithPath } from "@/lib/next-cloud";
import { bulkResumeQueue } from "@/lib/redis";
import {
  createBulkResumeBatch,
  createBulkResumeJobs,
  setBulkResumeBatchStatus,
} from "@workspace/db/queries";

const MAX_FILES = 50;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

function isAllowedFile(file: File): boolean {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return (
    (ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext)) &&
    file.size <= MAX_FILE_SIZE_BYTES
  );
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    const formData = await request.formData();
    const positionId = (formData.get("positionId") as string)?.trim() || undefined;
    const filesRaw = formData.getAll("files");
    const files = filesRaw.filter(
      (v): v is File => v instanceof File && v.size > 0,
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 },
      );
    }

    const rejected = files.filter((f) => !isAllowedFile(f));
    if (rejected.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid file(s): only PDF, .doc, .docx allowed, max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB each`,
        },
        { status: 400 },
      );
    }

    const batch = await createBulkResumeBatch({
      userId: user.id,
      totalCount: files.length,
    });
    if (!batch) {
      return NextResponse.json(
        { error: "Failed to create batch" },
        { status: 500 },
      );
    }

    const batchId = batch.id;
    const folderPath = `/BulkResumeStaging/${batchId}`;

    const uploadResults: Array<{ path: string; fileName: string; index: number }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const result = await uploadFileToNextCloudWithPath(file, folderPath);
      if (!result) {
        return NextResponse.json(
          { error: `Failed to upload file: ${file.name}` },
          { status: 500 },
        );
      }
      uploadResults.push({
        path: result.path,
        fileName: file.name,
        index: i,
      });
    }

    const jobRows = await createBulkResumeJobs(
      batchId,
      uploadResults.map((r) => ({ jobIndex: r.index, fileName: r.fileName })),
    );

    const jobIdByIndex = new Map(
      jobRows.map((row, idx) => [uploadResults[idx]?.index ?? idx, row.id]),
    );

    await setBulkResumeBatchStatus(batchId, "processing");

    for (const r of uploadResults) {
      const dbJobId = jobIdByIndex.get(r.index);
      if (!dbJobId) continue;
      const job = await bulkResumeQueue.add(
        "process-resume",
        {
          batchId,
          jobId: dbJobId,
          stagingPath: r.path,
          fileName: r.fileName,
          positionId,
          userId: user.id,
        },
        { jobId: dbJobId },
      );
    }

    return NextResponse.json({ success: true, batchId });
  } catch (error) {
    console.error("[POST /api/candidates/bulk-resume]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
