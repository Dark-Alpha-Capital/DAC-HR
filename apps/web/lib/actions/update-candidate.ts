"use server";

import { db } from "@workspace/db";
import {
  candidate,
  candidatePosition,
  application,
  interview,
} from "@workspace/db/schema";
import {
  CandidateFormSchema,
  candidateFormSchema,
} from "../schemas/candidate-form-schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq, and, inArray } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updateCandidate = async (
  candidateId: string,
  data: CandidateFormSchema,
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

    // Get the current positionId before updating
    const [existingRelation] = await db
      .select()
      .from(candidatePosition)
      .where(eq(candidatePosition.candidateId, candidateId))
      .limit(1);

    const oldPositionId = existingRelation?.positionId;
    const positionChanged = oldPositionId !== positionId;

    // Update the candidatePosition relationship
    if (positionId) {
      if (existingRelation) {
        // Update existing relationship if positionId changed
        if (positionChanged) {
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

    // Handle application updates when position changes
    if (positionId) {
      // Check if an application already exists for the new position
      const [existingApplicationForNewPosition] = await db
        .select()
        .from(application)
        .where(
          and(
            eq(application.candidateId, candidateId),
            eq(application.positionId, positionId),
          ),
        )
        .limit(1);

      if (positionChanged && oldPositionId) {
        // Position changed - find application for old position
        const [oldApplication] = await db
          .select()
          .from(application)
          .where(
            and(
              eq(application.candidateId, candidateId),
              eq(application.positionId, oldPositionId),
            ),
          )
          .limit(1);

        if (oldApplication) {
          // Application exists for old position
          if (!existingApplicationForNewPosition) {
            // No application for new position - update old one to point to new position
            // CRITICAL: When position changes, interviews become invalid because they
            // reference round templates for the old position. We need to handle them.

            // Get all interviews for this application
            const existingInterviews = await db
              .select({ id: interview.id, status: interview.status })
              .from(interview)
              .where(eq(interview.applicationId, oldApplication.id));

            // Delete pending/scheduled interviews - they're not meaningful for the new position
            // Keep completed interviews for historical purposes (they'll be orphaned but that's acceptable)
            const interviewsToDelete = existingInterviews.filter(
              (inv) => inv.status === "pending" || inv.status === "scheduled",
            );

            if (interviewsToDelete.length > 0) {
              const interviewIdsToDelete = interviewsToDelete.map(
                (inv) => inv.id,
              );
              await db
                .delete(interview)
                .where(inArray(interview.id, interviewIdsToDelete));
            }

            // Invalidate cache for all affected interviews (including completed ones we kept)
            for (const inv of existingInterviews) {
              updateTag(`interview-${inv.id}`);
              revalidatePath(`/interviews/${inv.id}`);
            }

            // Invalidate cache for the old application (before position update)
            updateTag(`application-${oldApplication.id}`);
            revalidatePath(`/applications/${oldApplication.id}`);

            // Now update the application position
            await db
              .update(application)
              .set({
                positionId,
                updatedAt: new Date(),
              })
              .where(eq(application.id, oldApplication.id));
          }
          // If application already exists for new position, leave both as is
          // (candidate can have applications for multiple positions)
        } else if (!existingApplicationForNewPosition) {
          // No application for old position and none for new position - create one
          await db.insert(application).values({
            candidateId,
            positionId,
            status: "ai_screening",
          });
        }
      } else if (!oldPositionId) {
        // Position is being set for the first time - create application if it doesn't exist
        if (!existingApplicationForNewPosition) {
          await db.insert(application).values({
            candidateId,
            positionId,
            status: "ai_screening",
          });
        }
      }
    }

    // Get the application ID for cache invalidation
    let applicationId: string | undefined;
    if (positionId) {
      const [currentApplication] = await db
        .select()
        .from(application)
        .where(
          and(
            eq(application.candidateId, candidateId),
            eq(application.positionId, positionId),
          ),
        )
        .limit(1);
      applicationId = currentApplication?.id;
    }

    updateTag("candidates");
    updateTag(`candidate-applications-${candidateId}`);
    revalidatePath("/candidates");
    revalidatePath(`/candidates/${updatedCandidate.id}`);
    revalidatePath(`/candidates/${updatedCandidate.id}/edit`);
    if (applicationId) {
      updateTag(`application-${applicationId}`);
    }

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
