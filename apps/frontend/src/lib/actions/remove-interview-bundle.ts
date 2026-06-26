import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { deleteBundle } from "@workspace/db/repositories/interview-bundle-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const removeInterviewBundle = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: bundleId, context: { session } }) => {
    try {
      await deleteBundle(bundleId);

      insertAuditLog({
        userId: session.user.id,
        action: "delete_interview_bundle",
        entityType: "interview_bundle",
        entityId: bundleId,
        details: {
          deletedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true };
    } catch (error) {
      console.error("Error deleting interview bundle:", error);
      return { error: "Failed to delete interview bundle" };
    }
  });
