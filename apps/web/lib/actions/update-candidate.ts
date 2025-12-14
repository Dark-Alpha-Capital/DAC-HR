"use server";

import { db } from "@workspace/db";
import { candidate, candidatePosition } from "@workspace/db/schema";
import {
  CandidateFormSchema,
  candidateFormSchema,
} from "../schemas/candidate-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const updateCandidate = async (
  candidateId: string,
  data: CandidateFormSchema
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

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
    positionId,
  } = result.data;

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

    // Update the candidatePosition relationship
    if (positionId) {
      // Check if a relationship already exists
      const [existingRelation] = await db
        .select()
        .from(candidatePosition)
        .where(eq(candidatePosition.candidateId, candidateId))
        .limit(1);

      if (existingRelation) {
        // Update existing relationship if positionId changed
        if (existingRelation.positionId !== positionId) {
          await db
            .update(candidatePosition)
            .set({
              positionId,
              updatedAt: new Date(),
            })
            .where(eq(candidatePosition.candidateId, candidateId));
        }
      } else {
        // Create new relationship if it doesn't exist
        await db.insert(candidatePosition).values({
          candidateId,
          positionId,
        });
      }
    }

    revalidatePath("/candidates");
    revalidatePath(`/candidates/${updatedCandidate.id}`);
    revalidatePath(`/candidates/${updatedCandidate.id}/edit`);

    after(async () => {
      await insertAuditLog({
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
            positionId: positionId?.trim() || null,
          },
          updatedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            positionUpdated: !!positionId,
          },
        },
      });
    });

    return { success: true, data: updatedCandidate };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update candidate" };
  }
};
