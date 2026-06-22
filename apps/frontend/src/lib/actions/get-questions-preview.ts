import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { questionBank, roundTemplateQuestions } from "@workspace/db/schema";
import { eq, asc } from "@workspace/db";

export interface QuestionPreview {
  id: string;
  questionText: string;
  category: string | null;
  orderIndex: number | null;
}

export const getQuestionsPreview = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: roundId }) => {
    if (!roundId) return { questions: [] as QuestionPreview[] };

    const rows = await db
      .select({
        id: questionBank.id,
        questionText: questionBank.questionText,
        category: questionBank.category,
        orderIndex: questionBank.orderIndex,
      })
      .from(questionBank)
      .innerJoin(
        roundTemplateQuestions,
        eq(roundTemplateQuestions.questionId, questionBank.id),
      )
      .where(eq(roundTemplateQuestions.roundTemplateId, roundId))
      .orderBy(asc(questionBank.orderIndex));

    return { questions: rows as QuestionPreview[] };
  });
