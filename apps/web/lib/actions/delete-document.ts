import { db } from "@workspace/db";
import { documents } from "@workspace/db/schema";

import { getSession } from "@/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const deleteDocument = async (id: string) => {
  // calling get session on the server
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get document data before deletion for audit log
    const [documentData] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    await db.delete(documents).where(eq(documents.id, id));
    if (documentData) {
      insertAuditLog({
          userId: session.user.id,
          action: "delete_document",
          entityType: "document",
          entityId: id,
          details: {
            document: {
              id: documentData.id,
              name: documentData.name,
              slug: documentData.slug,
              description: documentData.description,
              category: documentData.category,
              url: documentData.url,
              tags: documentData.tags,
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
    }

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete document" };
  }
};
