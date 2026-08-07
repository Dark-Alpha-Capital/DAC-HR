import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { application, candidate, position } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { sendMail } from "@workspace/mail";
import { getServerEmailSender } from "~/lib/server/email-sender";
import type { ApplicationStatus } from "@workspace/db/application-status";

export interface UpdateApplicationInput {
  applicationId: string;
  status?: ApplicationStatus;
  personality?:
    | "ENFJ"
    | "ENFP"
    | "ENTJ"
    | "ENTP"
    | "ESFJ"
    | "ESFP"
    | "ESTJ"
    | "ESTP"
    | "INFJ"
    | "INTJ"
    | "INTP"
    | "ISFJ"
    | "ISFP"
    | "ISTJ"
    | "ISTP"
    | null;
}

export const updateApplication = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateApplicationInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { applicationId, status, personality } = data;

    try {
      const updateData: Partial<typeof application.$inferInsert> = {};
      if (status !== undefined) updateData.status = status;
      if (personality !== undefined) updateData.personality = personality;

      const [updatedApplication] = await db
        .update(application)
        .set(updateData)
        .where(eq(application.id, applicationId))
        .returning();

      if (!updatedApplication) {
        return { error: "Application not found" };
      }

      // Non-blocking: when a candidate moves into onboarding (hired), send the
      // onboarding welcome email with their position info. A missing EMAIL
      // binding or send failure must not fail the status update.
      if (
        status === "onboarding" &&
        updatedApplication.status === "onboarding"
      ) {
        const [context] = await db
          .select({
            candidateEmail: candidate.email,
            candidateName: candidate.firstName,
            candidateLastName: candidate.lastName,
            candidateLocationCity: candidate.locationCity,
            candidateLocationState: candidate.locationState,
            positionName: position.name,
          })
          .from(application)
          .innerJoin(candidate, eq(candidate.id, application.candidateId))
          .innerJoin(position, eq(position.id, application.positionId))
          .where(eq(application.id, applicationId))
          .limit(1);

        if (context?.candidateEmail) {
          const sender = getServerEmailSender();
          if (sender) {
            sendMail({
              sender,
              to: context.candidateEmail,
              template: "onboarding-welcome",
              data: {
                candidateName:
                  `${context.candidateName} ${context.candidateLastName}`.trim(),
                positionName: context.positionName,
                location:
                  context.candidateLocationCity &&
                  context.candidateLocationState
                    ? `${context.candidateLocationCity}, ${context.candidateLocationState}`
                    : context.candidateLocationCity ||
                      context.candidateLocationState ||
                      null,
                contactEmail: "people@darkalphacapital.com",
              },
            }).catch((error) =>
              console.error("Failed to send onboarding welcome email:", error),
            );
          }
        }
      }

      insertAuditLog({
        userId: session.user.id,
        action: "update_application",
        entityType: "application",
        entityId: updatedApplication.id,
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
            personality,
          },
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

      return { success: true, data: updatedApplication };
    } catch (error) {
      console.error("Error updating application", error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to update application" };
    }
  });
