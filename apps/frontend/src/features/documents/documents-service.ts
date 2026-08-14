import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { documents } from "@workspace/db/schema";
import slugify from "slugify";
import { setDocumentCategories } from "@workspace/db/repositories/document-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  documentUploadInputSchema,
  type DocumentUploadInput,
} from "#/features/documents/schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

type CreateDocumentRecordInput = DocumentUploadInput & {
  url: string;
  user: Actor;
};

export async function createDocumentRecord({
  name,
  description,
  categoryIds,
  url,
  tags,
  user,
}: CreateDocumentRecordInput) {
  const result = documentUploadInputSchema.safeParse({
    name,
    description,
    categoryIds,
    tags,
  });

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const validated = result.data;

  try {
    const [newDocument] = await db
      .insert(documents)
      .values({
        name: validated.name,
        slug: slugify(validated.name, { lower: true, strict: true }),
        description:
          validated.description && validated.description.trim() !== ""
            ? validated.description
            : null,
        category: "other",
        url,
        tags: validated.tags.length > 0 ? validated.tags : null,
      })
      .returning();

    if (validated.categoryIds.length > 0 && newDocument) {
      await setDocumentCategories(newDocument.id, validated.categoryIds);
    }

    insertAuditLog({
      userId: user.id,
      action: "create_document",
      entityType: "document",
      entityId: newDocument?.id ?? "",
      details: {
        document: {
          id: newDocument?.id ?? "",
          name: newDocument?.name ?? "",
          slug: newDocument?.slug ?? "",
          description: newDocument?.description ?? "",
          category: newDocument?.category ?? "",
          url: newDocument?.url ?? "",
          tags: newDocument?.tags ?? [],
          createdAt: newDocument?.createdAt.toISOString() ?? "",
          updatedAt: newDocument?.updatedAt.toISOString() ?? "",
        },
        file: {
          name: validated.name,
          url,
        },
        createdBy: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true as const, data: newDocument };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create document" };
  }
}

export const deleteDocument = async (id: string, actor: Actor) => {
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
        userId: actor.id,
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
            id: actor.id,
            email: actor.email,
            name: actor.name,
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
