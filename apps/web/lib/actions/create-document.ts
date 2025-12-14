"use server";
import { db } from "@workspace/db";
import { documents } from "@workspace/db/schema";
import slugify from "slugify";
import {
  DocumentFormSchema,
  documentFormSchema,
} from "../schemas/document-form-schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const createDocument = async (data: DocumentFormSchema) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = documentFormSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, description, category, url, tags } = result.data;

  try {
    const [newDocument] = await db
      .insert(documents)
      .values({
        name,
        slug: slugify(name, { lower: true, strict: true }),
        description:
          description && description.trim() !== "" ? description : null,
        category: category || "other",
        url,
        tags: tags && tags.length > 0 ? tags : null,
      })
      .returning();

    updateTag("documents");
    revalidatePath("/documents");

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "create_document",
        entityType: "document",
        entityId: newDocument?.id || "",
        details: {
          document: {
            id: newDocument?.id || "",
            name: newDocument?.name || "",
            slug: newDocument?.slug || "",
            description: newDocument?.description || "",
            category: newDocument?.category || "",
            url: newDocument?.url || "",
            tags: newDocument?.tags || [],
            createdAt: newDocument?.createdAt.toISOString() || "",
            updatedAt: newDocument?.updatedAt.toISOString() || "",
          },
          input: {
            name,
            description:
              description && description.trim() !== "" ? description : null,
            category: category || "other",
            url,
            tags: tags && tags.length > 0 ? tags : null,
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
      });
    });

    return { success: true, data: newDocument };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create document" };
  }
};
