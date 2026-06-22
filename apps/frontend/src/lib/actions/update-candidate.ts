import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { candidate, application } from "@workspace/db/schema";
import {
  CandidateFormSchema,
  candidateFormSchema,
} from "../schemas/candidate-form-schema";
import { eq, and, inArray } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updateCandidate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, CandidateFormSchema]) => data)
  .handler(async ({ data: [candidateId, data], context: { session } }) => {

  const result = candidateFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    location,
    source,
    sourceUrl,
    note,
    positionIds,
  } = result.data;

  const normalizedPositionIds = positionIds
    .map((id) => id.trim())
    .filter(Boolean);

  try {
    const [updatedCandidate] = await db
      .update(candidate)
      .set({
        firstName,
        lastName,
        email,
        phone: phone || null,
        location: location || null,
        source: source || null,
        sourceUrl: sourceUrl?.trim() || null,
        note: note || null,
        updatedAt: new Date(),
      })
      .where(eq(candidate.id, candidateId))
      .returning();

    if (!updatedCandidate) {
      return { error: "Candidate not found" };
    }

    // Get existing applications for this candidate
    const existingApplications = await db
      .select({ positionId: application.positionId })
      .from(application)
      .where(eq(application.candidateId, candidateId));

    const existingPositionIds = new Set(
      existingApplications.map((a) => a.positionId),
    );

    // Create applications for new positions (skip already applied positions)
    let applicationsCreated = 0;
    for (const positionId of normalizedPositionIds) {
      if (!existingPositionIds.has(positionId)) {
        await db.insert(application).values({
          candidateId,
          positionId,
          status: "ai_screening",
        });
        applicationsCreated++;
      }
    }

    insertAuditLog({
        userId: session.user.id,
        action: "update_candidate",
        entityType: "candidate",
        entityId: updatedCandidate.id,
        details: {
          candidate: {
            id: updatedCandidate.id,
            firstName: updatedCandidate.firstName,
            lastName: updatedCandidate.lastName,
            email: updatedCandidate.email,
            phone: updatedCandidate.phone,
            location: updatedCandidate.location,
            source: updatedCandidate.source,
            sourceUrl: updatedCandidate.sourceUrl,
            note: updatedCandidate.note,
            updatedAt: updatedCandidate.updatedAt.toISOString(),
          },
          input: {
            firstName,
            lastName,
            email,
            phone: phone || null,
            location: location || null,
            source: source || null,
            sourceUrl: sourceUrl?.trim() || null,
            note: note || null,
            positionIds: normalizedPositionIds,
          },
          updatedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            positionIdsUpdated: normalizedPositionIds,
            applicationsCreated,
            existingApplicationCount: existingApplications.length,
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: updatedCandidate };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update candidate" };
  }
});
