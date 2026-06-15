import { createServerFn } from "@tanstack/react-start";
import { inArray } from "@workspace/db";
import { db } from "@workspace/db/db";
import {
  candidate,
  application,
  candidatePosition,
} from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { candidateFormSchema } from "../schemas/candidate-form-schema";
import type { CandidateFormSchema } from "../schemas/candidate-form-schema";
import { getSession } from "@/lib/middleware/auth-guard";

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

// Helper to check for existing emails in the database
const checkExistingEmails = async (emails: string[]): Promise<Set<string>> => {
  if (emails.length === 0) return new Set();

  const existingCandidates = await db
    .select({ email: candidate.email })
    .from(candidate)
    .where(inArray(candidate.email, emails));

  return new Set(existingCandidates.map((c) => c.email.toLowerCase()));
};

export const bulkCreateCandidates = createServerFn({ method: "POST" })
  .validator((data: BulkCandidateRow[],) => data)
  .handler(async ({ data: candidates }) => {
  const session = await getSession();

  if (!session?.user) {
    return {
      success: false,
      created: 0,
      failed: candidates.length,
      errors: [{ row: 0, field: "auth", message: "Unauthorized" }],
    };
  }

  const errors: BulkCandidateValidationError[] = [];
  const validatedCandidates: Array<{
    row: number;
    data: CandidateFormSchema;
  }> = [];

  // STEP 1: Validate ALL candidates first (all-or-nothing approach)
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
      // Extract all validation errors from Zod
      validation.error.issues.forEach((issue) => {
        const field = issue.path.length > 0 ? String(issue.path[0]) : "general";
        const message = issue.message || "Invalid input";
        errors.push({ row, field, message });
      });
      continue;
    }

    validatedCandidates.push({ row, data: validation.data });
  }

  // STEP 2: Check for duplicate emails in the database
  if (validatedCandidates.length > 0 && errors.length === 0) {
    const emailsToCheck = validatedCandidates.map((c) => c.data.email);
    const existingEmails = await checkExistingEmails(emailsToCheck);

    // Check each validated candidate's email against existing database emails
    validatedCandidates.forEach(({ row, data }) => {
      if (existingEmails.has(data.email.toLowerCase())) {
        errors.push({
          row,
          field: "email",
          message: "Email already exists in database",
        });
      }
    });
  }

  // STEP 3: If ANY validation failed, return early without creating anything
  if (errors.length > 0) {
    return {
      success: false,
      created: 0,
      failed: errors.length,
      errors,
    };
  }

  // STEP 4: All validations passed - create ALL candidates in a transaction
  const createdCandidates: Array<{ id: string; email: string }> = [];
  const auditPayloads: Array<Parameters<typeof insertAuditLog>[0]> = [];

  try {
    await db.transaction(async (tx) => {
      for (const { row, data } of validatedCandidates) {
        const { positionId, ...candidateFields } = data;

        // Insert candidate
        const [newCandidate] = await tx
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
          throw new Error(`Failed to create candidate at row ${row}`);
        }

        // Link position if provided
        if (positionId?.trim()) {
          await Promise.all([
            tx.insert(application).values({
              candidateId: newCandidate.id,
              positionId,
              status: "ai_screening",
            }),
            tx.insert(candidatePosition).values({
              candidateId: newCandidate.id,
              positionId,
            }),
          ]);
        }

        createdCandidates.push({
          id: newCandidate.id,
          email: newCandidate.email,
        });

        auditPayloads.push({
          userId: session.user.id,
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
            bulkUpload: { row, totalRows: candidates.length },
          },
        });
      }
    });

    if (auditPayloads.length > 0) {
      Promise.allSettled(auditPayloads.map((payload) => insertAuditLog(payload)))
        .catch((error) => console.error("Audit log error:", error));
    }

    // Revalidate cache only after successful transaction
    return {
      success: true,
      created: createdCandidates.length,
      failed: 0,
      errors: [],
      data: createdCandidates,
    };
  } catch (error) {
    // Transaction failed - rollback automatically, return error
    console.error("Transaction failed:", error);
    return {
      success: false,
      created: 0,
      failed: candidates.length,
      errors: [
        {
          row: 0,
          field: "general",
          message:
            error instanceof Error
              ? `Transaction failed: ${error.message}`
              : "Failed to create candidates. All changes were rolled back.",
        },
      ],
    };
  }
});