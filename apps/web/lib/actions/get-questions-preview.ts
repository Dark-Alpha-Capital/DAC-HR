import { defineQueryWithInput } from "./create-action";
import { db } from "@workspace/db/db";
import {
  interview,
  positionRoundTemplates,
  roundTemplateQuestions,
  questionBank,
} from "@workspace/db/schema";
import { eq, asc } from "@workspace/db";
import { getSession } from "@/lib/middleware/auth-guard";

export interface QuestionPreview {
  id: string;
  questionText: string;
  category: string | null;
  orderIndex: number | null;
}

export const getQuestionsPreview = defineQueryWithInput(async (interviewId: string): Promise<
  { questions: QuestionPreview[] } | { error: string }
> => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (!interviewId) {
    return { error: "Interview ID is required" };
  }

  try {
    const [row] = await db
      .select({ roundId: positionRoundTemplates.roundTemplateId })
      .from(interview)
      .innerJoin(
        positionRoundTemplates,
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id),
      )
      .where(eq(interview.id, interviewId))
      .limit(1);

    if (!row) {
      return { error: "Interview not found" };
    }

    const questions = await db
      .select({
        id: questionBank.id,
        questionText: questionBank.questionText,
        category: questionBank.category,
        orderIndex: questionBank.orderIndex,
      })
      .from(roundTemplateQuestions)
      .innerJoin(
        questionBank,
        eq(roundTemplateQuestions.questionId, questionBank.id),
      )
      .where(eq(roundTemplateQuestions.roundTemplateId, row.roundId))
      .orderBy(asc(questionBank.orderIndex));

    return { questions };
  } catch (error) {
    console.error("Error fetching questions preview", error);
    return { error: "Failed to fetch questions" };
  }
});
