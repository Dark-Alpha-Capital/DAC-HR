import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { questionBank } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { normalizeMcqOptions } from "~/lib/question-options";
import {
  questionEditFormSchema,
  type QuestionEditFormSchema,
} from "~/lib/schemas/question-form-schema";

export interface PatchQuestionInput {
  questionId: string;
  formData: QuestionEditFormSchema;
}

export const patchQuestion = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: PatchQuestionInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const { questionId, formData } = data;

    const result = questionEditFormSchema.safeParse(formData);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const parsed = result.data;
    const { questionText } = parsed;

    try {
      const [updatedQuestion] = await db
        .update(questionBank)
        .set({
          questionText,
          options:
            parsed.questionType === "mcq"
              ? normalizeMcqOptions(parsed.options)
              : null,
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
            questionType: updatedQuestion.questionType,
            updatedAt: updatedQuestion.updatedAt.toISOString(),
          },
          input: {
            questionText,
            questionType: parsed.questionType,
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
  });
