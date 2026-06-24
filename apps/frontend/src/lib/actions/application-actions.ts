import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import {
  application,
  candidate,
  candidatePosition,
  position,
  documents,
} from "@workspace/db/schema";
import { eq, inArray, and } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import type { ApplicationStatus } from "@workspace/db/application-status";

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

      await db.insert(candidatePosition).values({
        candidateId,
        positionId,
      });

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

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, ApplicationStatus]) => data)
  .handler(async ({ data: [applicationId, status], context: { session } }) => {

  try {
    // Get current application data before update
    const [currentApplication] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    // Update the application status
    const [updatedApplication] = await db
      .update(application)
      .set({ status })
      .where(eq(application.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return { success: false, error: "Application not found" };
    }
    insertAuditLog({
        userId: session.user.id,
        action: "update_application_status",
        entityType: "application",
        entityId: applicationId,
        details: {
          application: {
            id: updatedApplication.id,
            candidateId: updatedApplication.candidateId,
            positionId: updatedApplication.positionId,
            status: updatedApplication.status,
            personality: updatedApplication.personality,
            updatedAt: updatedApplication.updatedAt.toISOString(),
          },
          input: {
            applicationId,
            status,
          },
          previousStatus: currentApplication?.status || null,
          updatedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

    return { success: true, application: updatedApplication };
  } catch (error) {
    console.error("Error updating application status:", error);
    return { success: false, error: "Failed to update application status" };
  }
});

/**
 * Get application by ID with related data
 */
export const getApplicationById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: applicationId, context: { session } }) => {
  try {
    const [applicationData] = await db
      .select()
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!applicationData) {
      return { success: false, error: "Application not found" };
    }

    return { success: true, application: applicationData };
  } catch (error) {
    console.error("Error fetching application:", error);
    return { success: false, error: "Failed to fetch application" };
  }
});
