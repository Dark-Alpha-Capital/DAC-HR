import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import {
  application,
  candidate,
  candidatePosition,
  position,
} from "@workspace/db/schema";
import { eq, and } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export interface CreateApplicationInput {
  candidateId: string;
  positionId: string;
}

export const createApplication = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateApplicationInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { candidateId, positionId } = data;

    try {
      const [candidateRecord] = await db
        .select({ id: candidate.id })
        .from(candidate)
        .where(eq(candidate.id, candidateId))
        .limit(1);

      if (!candidateRecord) {
        return { error: "Candidate not found" };
      }

      const [positionRecord] = await db
        .select({ id: position.id, name: position.name })
        .from(position)
        .where(eq(position.id, positionId))
        .limit(1);

      if (!positionRecord) {
        return { error: "Position not found" };
      }

      const [existingApplication] = await db
        .select({ id: application.id })
        .from(application)
        .where(
          and(
            eq(application.candidateId, candidateId),
            eq(application.positionId, positionId),
          ),
        )
        .limit(1);

      if (existingApplication) {
        return { error: "Application already exists for this position" };
      }

      const [newApplication] = await db
        .insert(application)
        .values({
          candidateId,
          positionId,
          status: "ai_screening",
        })
        .returning();

      if (!newApplication) {
        return { error: "Failed to create application" };
      }

      await db
        .insert(candidatePosition)
        .values({
          candidateId,
          positionId,
        })
        .onConflictDoNothing();

      insertAuditLog({
        userId: session.user.id,
        action: "create_application",
        entityType: "application",
        entityId: newApplication.id,
        details: {
          application: {
            id: newApplication.id,
            candidateId: newApplication.candidateId,
            positionId: newApplication.positionId,
            status: newApplication.status,
            createdAt: newApplication.createdAt.toISOString(),
          },
          position: {
            id: positionRecord.id,
            name: positionRecord.name,
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, application: newApplication };
    } catch (error) {
      console.error("Error creating application:", error);
      return { error: "Failed to create application" };
    }
  });
