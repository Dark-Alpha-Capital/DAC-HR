import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { questionBank } from "@workspace/db/schema";
import { inArray } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getQuestionById } from "@workspace/db/queries";

export const bulkDeleteQuestions = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string[]) => data)
  .handler(async ({ data: ids, context: { session } }) => {
    if (ids.length === 0) {
      return { error: "No questions selected" };
    }

    try {
      const questions = await Promise.all(ids.map((id) => getQuestionById(id)));

      await db.delete(questionBank).where(inArray(questionBank.id, ids));

      for (const questionData of questions) {
        if (!questionData) continue;

        insertAuditLog({
          userId: session.user.id,
          action: "delete_question",
          entityType: "question",
          entityId: questionData.id,
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
              bulkDelete: true,
            },
          },
        }).catch((error) => console.error("Audit log error:", error));
      }

      return { success: true, deleted: ids.length };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to delete questions" };
    }
  });
