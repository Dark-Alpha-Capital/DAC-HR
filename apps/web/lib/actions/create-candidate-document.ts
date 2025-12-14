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
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const createCandidateDocument = async (
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
    const [newCandidateDocument] = await db
      .insert(candidateDocument)
      .values({
        candidateId,
        name,
        description:
          description && description.trim() !== "" ? description : null,
        category: category || "other",
        url,
        tags: tags && tags.length > 0 ? tags : null,
      })
      .returning();

    revalidatePath(`/candidates/${candidateId}`);
    revalidatePath("/candidates");

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "create_candidate_document",
        entityType: "candidate_document",
        entityId: newCandidateDocument?.id || "",
        details: {
          candidateDocument: {
            id: newCandidateDocument?.id || "",
            candidateId: newCandidateDocument?.candidateId || "",
            name: newCandidateDocument?.name || "",
            description: newCandidateDocument?.description || "",
            category: newCandidateDocument?.category || "",
            url: newCandidateDocument?.url || "",
            tags: newCandidateDocument?.tags || [],
            createdAt: newCandidateDocument?.createdAt.toISOString() || "",
            updatedAt: newCandidateDocument?.updatedAt.toISOString() || "",
          },
          input: {
            candidateId,
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

    return { success: true, data: newCandidateDocument };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create candidate document" };
  }
};
