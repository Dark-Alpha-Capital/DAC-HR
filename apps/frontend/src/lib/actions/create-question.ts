import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { questionBank, roundTemplateQuestions } from "@workspace/db/schema";
import {
  QuestionFormSchema,
  questionFormSchema,
} from "../schemas/question-form-schema";
import { getSession } from "~/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { normalizeMcqOptions } from "~/lib/question-options";

export const createQuestion = createServerFn({ method: "POST" })
  .validator((data: QuestionFormSchema) => data)
  .handler(async ({ data }) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = questionFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const parsed = result.data;
  const { questionText, roundTemplateId } = parsed;

  try {
    const [newQuestion] = await db
      .insert(questionBank)
      .values({
        questionText,
        questionType: parsed.questionType,
        options:
          parsed.questionType === "mcq"
            ? normalizeMcqOptions(parsed.options)
            : null,
      })
      .returning();

    if (!newQuestion) {
      return { error: "Failed to create question" };
    }

    await db.insert(roundTemplateQuestions).values({
      roundTemplateId,
      questionId: newQuestion.id,
    });
    insertAuditLog({
      userId: session.user.id,
      action: "create_question",
      entityType: "question",
      entityId: newQuestion.id,
      details: {
        question: {
          id: newQuestion.id,
          questionText: newQuestion.questionText,
          questionType: newQuestion.questionType,
          createdAt: newQuestion.createdAt.toISOString(),
          updatedAt: newQuestion.updatedAt.toISOString(),
        },
        input: {
          questionText,
          questionType: parsed.questionType,
          roundTemplateId,
        },
        createdBy: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          linkedToRound: true,
        },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { success: true, data: newQuestion };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create question" };
  }
});

export const createQuestionForRound = createServerFn({ method: "POST" })
  .validator((data: [QuestionFormSchema, string]) => data)
  .handler(async ({ data: [formData, roundId] }) => {
    const data = formData;
    const session = await getSession();

    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const result = questionFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const parsed = result.data;
    const { questionText } = parsed;

    try {
      const [newQuestion] = await db
        .insert(questionBank)
        .values({
          questionText,
          questionType: parsed.questionType,
          options:
            parsed.questionType === "mcq"
              ? normalizeMcqOptions(parsed.options)
              : null,
        })
        .returning();

      if (!newQuestion) {
        return { error: "Failed to create question" };
      }

      await db.insert(roundTemplateQuestions).values({
        roundTemplateId: roundId,
        questionId: newQuestion.id,
      });
      insertAuditLog({
        userId: session.user.id,
        action: "create_question_for_round",
        entityType: "question",
        entityId: newQuestion.id,
        details: {
          question: {
            id: newQuestion.id,
            questionText: newQuestion.questionText,
            questionType: newQuestion.questionType,
            createdAt: newQuestion.createdAt.toISOString(),
            updatedAt: newQuestion.updatedAt.toISOString(),
          },
          input: {
            questionText,
            questionType: parsed.questionType,
            roundId,
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            linkedToRound: true,
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: newQuestion };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to create question" };
    }
  });
