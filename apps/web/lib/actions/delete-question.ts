import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { questionBank } from "@workspace/db/schema";

import { getSession } from "@/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getQuestionById } from "@workspace/db/queries";

export const deleteQuestion = createServerFn({ method: "POST" })
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get question data before deletion for audit log
    const questionData = await getQuestionById(id);

    await db.delete(questionBank).where(eq(questionBank.id, id));
    if (questionData) {
      insertAuditLog({
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
        }).catch((error) => console.error("Audit log error:", error));
    }

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete question" };
  }
});
