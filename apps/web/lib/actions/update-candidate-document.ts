"use server";
import { db } from "@workspace/db";
import { candidateDocument } from "@workspace/db/schema";
import {
  CandidateDocumentFormSchema,
  candidateDocumentFormSchema,
} from "../schemas/candidate-document-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export const updateCandidateDocument = async (
  documentId: string,
  candidateId: string,
  data: CandidateDocumentFormSchema
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = candidateDocumentFormSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, description, category, url, tags } = result.data;

  // Ensure URL is provided (should be handled by form, but double-check)
  if (!url || url.trim() === "") {
    return { error: "URL is required" };
  }

  try {
    const [updatedDocument] = await db
      .update(candidateDocument)
      .set({
        name,
        description:
          description && description.trim() !== "" ? description : null,
        category: category || "other",
        url,
        tags: tags && tags.length > 0 ? tags : null,
        updatedAt: new Date(),
      })
      .where(eq(candidateDocument.id, documentId))
      .returning();

    if (!updatedDocument) {
      return { error: "Candidate document not found" };
    }

    revalidatePath(`/candidates/${candidateId}`);
    revalidatePath("/candidates");

    return { success: true, data: updatedDocument };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update candidate document" };
  }
};

