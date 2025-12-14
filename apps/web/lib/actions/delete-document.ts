"use server";

import { db } from "@workspace/db";
import { documents } from "@workspace/db/schema";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const deleteDocument = async (id: string) => {
  // calling get session on the server
  const session = await auth.api.getSession({
    headers: await headers(), // some endpoints might require headers
  });

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

    updateTag("documents");
    revalidatePath("/documents");

    if (documentData) {
      after(async () => {
        await insertAuditLog({
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
        });
      });
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
