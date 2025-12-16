"use server";

import { db } from "@workspace/db";
import { candidateDocument } from "@workspace/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const deleteCandidateDocument = async (
  documentId: string,
  candidateId: string
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get document data before deletion for audit log

    await db
      .delete(candidateDocument)
      .where(eq(candidateDocument.id, documentId));

    updateTag(`candidate-documents-${candidateId}`);
    revalidatePath(`/candidates/${candidateId}`);
    revalidatePath("/candidates");

    after(async () => {
      const [documentData] = await db
        .select()
        .from(candidateDocument)
        .where(eq(candidateDocument.id, documentId))
        .limit(1);

      await insertAuditLog({
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
      });
    });

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete candidate document" };
  }
};
