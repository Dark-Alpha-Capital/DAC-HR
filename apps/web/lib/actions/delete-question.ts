"use server";

import { db } from "@workspace/db";
import { questionBank } from "@workspace/db/schema";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getQuestionById } from "@workspace/db/queries";

export const deleteQuestion = async (id: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get question data before deletion for audit log
    const questionData = await getQuestionById(id);

    await db.delete(questionBank).where(eq(questionBank.id, id));

    revalidatePath("/questions");

    if (questionData) {
      after(async () => {
        await insertAuditLog({
          userId: session.user.id,
          action: "delete_question",
          entityType: "question",
          entityId: id,
          details: {
            question: {
              id: questionData.id,
              questionText: questionData.questionText,
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

    return { error: "Failed to delete question" };
  }
};
