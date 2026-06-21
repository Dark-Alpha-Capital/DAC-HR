import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { candidateDocument } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const deleteCandidateDocument = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, string]) => data)
  .handler(async ({ data: [documentId, candidateId], context: { session } }) => {

  try {
    const [documentData] = await db
      .select()
      .from(candidateDocument)
      .where(eq(candidateDocument.id, documentId))
      .limit(1);

    await db
      .delete(candidateDocument)
      .where(eq(candidateDocument.id, documentId));

    insertAuditLog({
      userId: session.user.id,
      action: "delete_candidate_document",
      entityType: "candidate_document",
      entityId: documentId,
      details: {
        candidateDocument: {
          id: documentData?.id || "",
          candidateId: documentData?.candidateId || "",
          name: documentData?.name || "",
          description: documentData?.description || "",
          category: documentData?.category || "",
          url: documentData?.url || "",
          tags: documentData?.tags || [],
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
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete candidate document" };
  }
});
