"use server";
import { db } from "@workspace/db";
import { documents } from "@workspace/db/schema";
import slugify from "slugify";
import {
  DocumentFormSchema,
  documentFormSchema,
} from "../schemas/document-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";

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

    revalidatePath("/documents");

    return { success: true, data: newDocument };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create document" };
  }
};
