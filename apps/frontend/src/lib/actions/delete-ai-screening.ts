import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { candidateAiScreening } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const deleteAiScreening = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, string]) => data)
  .handler(async ({ data: [screeningId, candidateId], context: { session } }) => {

  try {
    // Get screening data before deletion for audit log
    const [screeningData] = await db
      .select()
      .from(candidateAiScreening)
      .where(eq(candidateAiScreening.id, screeningId))
      .limit(1);

    if (!screeningData) {
      return { error: "AI screening not found" };
    }

    await db
      .delete(candidateAiScreening)
      .where(eq(candidateAiScreening.id, screeningId));
    insertAuditLog({
        userId: session.user.id,
        action: "delete_ai_screening",
        entityType: "candidate_ai_screening",
        entityId: screeningId,
        details: {
          aiScreening: {
            id: screeningData.id,
            candidateId: screeningData.candidateId,
            positionId: screeningData.positionId,
            applicationId: screeningData.applicationId,
            model: screeningData.model,
            createdAt: screeningData.createdAt.toISOString(),
          },
          deletedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

    return { success: true };
  } catch (error) {
    console.error("Error deleting AI screening:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete AI screening",
    };
  }
});
