import { db } from "@workspace/db";
import { questionBank } from "@workspace/db/schema";
import {
  QuestionFormSchema,
  questionFormSchema,
  QuestionEditFormSchema,
  questionEditFormSchema,
} from "../schemas/question-form-schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updateQuestion = async (
  questionId: string,
  data: QuestionEditFormSchema,
) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = questionEditFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { questionText } = result.data;

  try {
    const [updatedQuestion] = await db
      .update(questionBank)
      .set({
        questionText,
        updatedAt: new Date(),
      })
      .where(eq(questionBank.id, questionId))
      .returning();

    if (!updatedQuestion) {
      return { error: "Question not found" };
    }
    insertAuditLog({
        userId: session.user.id,
        action: "update_question",
        entityType: "question",
        entityId: updatedQuestion.id,
        details: {
          question: {
            id: updatedQuestion.id,
            questionText: updatedQuestion.questionText,
            updatedAt: updatedQuestion.updatedAt.toISOString(),
          },
          input: {
            questionText,
          },
          updatedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: updatedQuestion };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update question" };
  }
};
