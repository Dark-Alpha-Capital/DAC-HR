import { db } from "@workspace/db/db";
import { eq, inArray } from "@workspace/db";
import { questionBank, roundTemplateQuestions } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  getPositions,
  getQuestionById,
  getQuestionsWithRounds,
  getRounds,
} from "@workspace/db/repositories/position-repository";
import { normalizeMcqOptions } from "../helpers";
import { questionFormSchema, type QuestionFormSchema } from "../schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type QuestionFormData = QuestionFormSchema;

export type PatchQuestionInput = {
  questionId: string;
  questionText: string;
  questionType: string;
  options?: Array<{ id?: string; text: string }>;
};

type QuestionsIndexInput = {
  search?: string;
  position?: string[];
  round?: string[];
  page?: number;
};

export const questionsService = {
  async list(deps: QuestionsIndexInput) {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, rounds, questionsResult] = await Promise.all([
      getPositions(),
      getRounds(),
      getQuestionsWithRounds(
        deps.search || undefined,
        deps.position && deps.position.length > 0 ? deps.position : undefined,
        deps.round && deps.round.length > 0 ? deps.round : undefined,
        currentPage,
        limit,
      ),
    ]);

    const { questions, total } = questionsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      rounds,
      questions,
      currentPage,
      limit,
      totalCount: total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.search || deps.position?.length || deps.round?.length,
      ),
    };
  },

  async getNewOptions() {
    const { positions } = await getPositions();

    return {
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
    };
  },

  async getById(id: string) {
    const question = await getQuestionById(id);
    return { question };
  },

  async create(input: QuestionFormData, actor: Actor) {
    const result = questionFormSchema.safeParse(input);
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
  },

  async patch(input: PatchQuestionInput, actor: Actor) {
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
  },

  async delete(id: string, actor: Actor) {
    try {
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
  },

  async bulkDelete(ids: string[], actor: Actor) {
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
  },
};
