import { db } from "@workspace/db/db";
import { eq, inArray } from "@workspace/db";
import { questionBank, roundTemplateQuestions } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getQuestionById } from "@workspace/db/modules/positions";
import { normalizeMcqOptions } from "#/features/questions/helpers";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type QuestionFormData = {
  questionText: string;
  questionType: "text" | "mcq" | "video" | "audio" | string;
  options?: Array<{ id?: string; text: string }>;
  roundTemplateId: string;
};

export const createQuestion = async (
  input: QuestionFormData,
  actor: Actor,
) => {
  const parsed = input;
  const { questionText, roundTemplateId } = parsed;

  try {
    const [newQuestion] = await db
      .insert(questionBank)
      .values({
        questionText,
        questionType: parsed.questionType as "text",
        options:
          parsed.questionType === "mcq"
            ? normalizeMcqOptions(parsed.options ?? [])
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
      userId: actor.id,
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
          id: actor.id,
          email: actor.email,
          name: actor.name,
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
};

export const createQuestionForRound = async (
  input: QuestionFormData,
  roundId: string,
  actor: Actor,
) => {
  const parsed = input;
  const { questionText } = parsed;

  try {
    const [newQuestion] = await db
      .insert(questionBank)
      .values({
        questionText,
        questionType: parsed.questionType as "text",
        options:
          parsed.questionType === "mcq"
            ? normalizeMcqOptions(parsed.options ?? [])
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
      userId: actor.id,
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
          id: actor.id,
          email: actor.email,
          name: actor.name,
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
};

export type PatchQuestionInput = {
  questionId: string;
  questionText: string;
  questionType: string;
  options?: Array<{ id?: string; text: string }>;
};

export const patchQuestion = async (input: PatchQuestionInput, actor: Actor) => {
  const { questionId, questionText, questionType, options } = input;

  try {
    const [updatedQuestion] = await db
      .update(questionBank)
      .set({
        questionText,
        options:
          questionType === "mcq" ? normalizeMcqOptions(options ?? []) : null,
        updatedAt: new Date(),
      })
      .where(eq(questionBank.id, questionId))
      .returning();

    if (!updatedQuestion) {
      return { error: "Question not found" };
    }

    insertAuditLog({
      userId: actor.id,
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
          questionType,
        },
        updatedBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
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

export const deleteQuestion = async (id: string, actor: Actor) => {
  try {
    // Get question data before deletion for audit log
    const questionData = await getQuestionById(id);

    await db.delete(questionBank).where(eq(questionBank.id, id));
    if (questionData) {
      insertAuditLog({
        userId: actor.id,
        action: "delete_question",
        entityType: "question",
        entityId: id,
        details: {
          question: {
            id: questionData.id,
            questionText: questionData.questionText,
          },
          deletedBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
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
};

export const bulkDeleteQuestions = async (ids: string[], actor: Actor) => {
  if (ids.length === 0) {
    return { error: "No questions selected" };
  }

  try {
    const questions = await Promise.all(ids.map((id) => getQuestionById(id)));

    await db.delete(questionBank).where(inArray(questionBank.id, ids));

    for (const questionData of questions) {
      if (!questionData) continue;

      insertAuditLog({
        userId: actor.id,
        action: "delete_question",
        entityType: "question",
        entityId: questionData.id,
        details: {
          question: {
            id: questionData.id,
            questionText: questionData.questionText,
          },
          deletedBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
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
};
