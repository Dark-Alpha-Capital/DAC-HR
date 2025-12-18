"use server";

import { db } from "@workspace/db";
import {
  candidate,
  application,
  candidatePosition,
} from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/queries";
import { candidateFormSchema } from "../schemas/candidate-form-schema";
import type { CandidateFormSchema } from "../schemas/candidate-form-schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";

export type BulkCandidateRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  source?: string;
  sourceUrl?: string;
  note?: string;
  positionId?: string;
};

export type BulkCandidateValidationError = {
  row: number;
  field: string;
  message: string;
};

export type BulkCandidateResult = {
  success: boolean;
  created: number;
  failed: number;
  errors: BulkCandidateValidationError[];
  data?: Array<{ id: string; email: string }>;
};

// Helper to extract error messages from Zod errors
const extractFieldErrors = (
  fieldErrors: Record<string, string[] | undefined>
): Array<{ field: string; message: string }> => {
  const errors: Array<{ field: string; message: string }> = [];
  (Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>).forEach(
    (field) => {
      const fieldError = fieldErrors[field];
      if (fieldError?.[0]) {
        errors.push({ field: String(field), message: fieldError[0] });
      }
    }
  );
  return errors;
};

// Helper to create a candidate with position linking
const createCandidateWithPosition = async (
  candidateData: CandidateFormSchema,
  userId: string,
  rowNumber: number,
  totalRows: number
) => {
  const { positionId, ...candidateFields } = candidateData;

  // Insert candidate
  const [newCandidate] = await db
    .insert(candidate)
    .values({
      firstName: candidateFields.firstName,
      lastName: candidateFields.lastName,
      email: candidateFields.email,
      phone: candidateFields.phone?.trim() || null,
      location: candidateFields.location?.trim() || null,
      source: candidateFields.source || null,
      sourceUrl: candidateFields.sourceUrl?.trim() || null,
      note: candidateFields.note?.trim() || null,
    })
    .returning();

  if (!newCandidate) {
    throw new Error("Failed to create candidate");
  }

  // Link position if provided
  if (positionId?.trim()) {
    try {
      await Promise.all([
        db.insert(application).values({
          candidateId: newCandidate.id,
          positionId,
          status: "pending",
        }),
        db.insert(candidatePosition).values({
          candidateId: newCandidate.id,
          positionId,
        }),
      ]);
    } catch (positionError) {
      console.error(
        `Failed to link position for candidate ${newCandidate.id}:`,
        positionError
      );
      // Don't throw - candidate was created successfully
    }
  }

  // Create audit log
  after(async () => {
    await insertAuditLog({
      userId,
      action: "bulk_create_candidate",
      entityType: "candidate",
      entityId: newCandidate.id,
      details: {
        candidate: {
          id: newCandidate.id,
          firstName: newCandidate.firstName,
          lastName: newCandidate.lastName,
          email: newCandidate.email,
          phone: newCandidate.phone,
          location: newCandidate.location,
          source: newCandidate.source,
          sourceUrl: newCandidate.sourceUrl,
          note: newCandidate.note,
        },
        bulkUpload: { row: rowNumber, totalRows },
      },
    });
  });

  return newCandidate;
};

export const bulkCreateCandidates = async (
  candidates: BulkCandidateRow[]
): Promise<BulkCandidateResult> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      created: 0,
      failed: candidates.length,
      errors: [{ row: 0, field: "auth", message: "Unauthorized" }],
    };
  }

  const errors: BulkCandidateValidationError[] = [];
  const createdCandidates: Array<{ id: string; email: string }> = [];
  let successCount = 0;

  // Process each candidate
  for (let i = 0; i < candidates.length; i++) {
    const row = i + 1;
    const candidateData = candidates[i];

    if (!candidateData) {
      errors.push({
        row,
        field: "general",
        message: "Invalid candidate data",
      });
      continue;
    }

    // Validate candidate data
    const validation = candidateFormSchema.safeParse({
      firstName: candidateData.firstName || "",
      lastName: candidateData.lastName || "",
      email: candidateData.email || "",
      phone: candidateData.phone || "",
      location: candidateData.location || "",
      source: candidateData.source,
      sourceUrl: candidateData.sourceUrl || "",
      note: candidateData.note || "",
      positionId: candidateData.positionId || "",
    });

    if (!validation.success) {
      const fieldErrors = extractFieldErrors(
        validation.error.flatten().fieldErrors
      );
      errors.push(
        ...fieldErrors.map((e) => ({ row, field: e.field, message: e.message }))
      );
      continue;
    }

    // Create candidate
    try {
      const newCandidate = await createCandidateWithPosition(
        validation.data,
        session.user.id,
        row,
        candidates.length
      );

      createdCandidates.push({
        id: newCandidate.id,
        email: newCandidate.email,
      });
      successCount++;
    } catch (error) {
      const isDuplicateEmail =
        error instanceof Error &&
        (error.message.includes("unique") ||
          error.message.includes("duplicate") ||
          error.message.includes("violates unique constraint"));

      errors.push({
        row,
        field: isDuplicateEmail ? "email" : "general",
        message: isDuplicateEmail
          ? "Email already exists in database"
          : error instanceof Error
            ? error.message
            : "Failed to create candidate",
      });
    }
  }

  // Revalidate cache
  updateTag("candidates");
  revalidatePath("/candidates");

  return {
    success: errors.length === 0,
    created: successCount,
    failed: errors.length,
    errors,
    data: createdCandidates,
  };
};
