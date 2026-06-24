import { and, eq, inArray, asc } from "@workspace/db";
import { db } from "@workspace/db/db";
import {
  candidateImport,
  candidateImportRow,
  type CandidateImport,
  type CandidateImportRow,
} from "@workspace/db/schema";
import type {
  CandidateImportStatus,
  CandidateImportType,
} from "@workspace/db/enums";

export async function getCandidateImportById(
  id: string,
): Promise<CandidateImport | null> {
  const [row] = await db
    .select()
    .from(candidateImport)
    .where(eq(candidateImport.id, id))
    .limit(1);
  return row ?? null;
}

export async function getCandidateImportRows(
  importId: string,
): Promise<CandidateImportRow[]> {
  return db
    .select()
    .from(candidateImportRow)
    .where(eq(candidateImportRow.importId, importId))
    .orderBy(asc(candidateImportRow.rowIndex));
}

export async function createCandidateImportRecord(input: {
  filename: string;
  type: CandidateImportType;
  uploadedBy: string;
  originalFileUrl: string;
  positionId?: string | null;
}) {
  const [row] = await db
    .insert(candidateImport)
    .values({
      filename: input.filename,
      type: input.type,
      uploadedBy: input.uploadedBy,
      originalFileUrl: input.originalFileUrl,
      positionId: input.positionId ?? null,
      status: "pending",
      duplicatePolicy: "skip",
    })
    .returning();
  return row;
}

export function getCandidateImportWorkflowId(importId: string): string {
  return `import-${importId}`;
}

const CANCELLABLE_IMPORT_STATUSES: CandidateImportStatus[] = [
  "pending",
  "processing",
];

export async function cancelCandidateImport(
  importId: string,
): Promise<{ cancelled: boolean }> {
  const [row] = await db
    .update(candidateImport)
    .set({
      status: "cancelled",
      error: "Cancelled by user",
    })
    .where(
      and(
        eq(candidateImport.id, importId),
        inArray(candidateImport.status, CANCELLABLE_IMPORT_STATUSES),
      ),
    )
    .returning();
  return { cancelled: Boolean(row) };
}

export async function updateCandidateImportStatus(
  id: string,
  status: CandidateImportStatus,
  updates?: {
    error?: string | null;
    totalCandidates?: number;
    processedCandidates?: number;
    failedCandidates?: number;
  },
) {
  await db
    .update(candidateImport)
    .set({
      status,
      error: updates?.error,
      totalCandidates: updates?.totalCandidates,
      processedCandidates: updates?.processedCandidates,
      failedCandidates: updates?.failedCandidates,
    })
    .where(eq(candidateImport.id, id));
}
