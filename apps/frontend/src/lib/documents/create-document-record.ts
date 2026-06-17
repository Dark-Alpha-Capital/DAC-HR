import { db } from "@workspace/db/db";
import { documents } from "@workspace/db/schema";
import slugify from "slugify";
import { setDocumentCategories } from "@workspace/db/repositories/document-repository";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  documentUploadInputSchema,
  type DocumentUploadInput,
} from "~/lib/schemas/document-form-schema";

type CreateDocumentRecordInput = DocumentUploadInput & {
  url: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
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
