"use server";

import { db } from "@workspace/db";
import { questionBank, roundTemplateQuestions } from "@workspace/db/schema";
import {
  QuestionFormSchema,
  questionFormSchema,
} from "../schemas/question-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";

export const createQuestion = async (data: QuestionFormSchema) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = questionFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { questionText } = result.data;

  try {
    const [newQuestion] = await db
      .insert(questionBank)
      .values({
        questionText,
      })
      .returning();

    if (!newQuestion) {
      return { error: "Failed to create question" };
    }

    revalidatePath("/questions");

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
  data: QuestionFormSchema,
  roundId: string
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = questionFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { questionText } = result.data;

  try {
    // Create the question
    const [newQuestion] = await db
      .insert(questionBank)
      .values({
        questionText,
      })
      .returning();

    if (!newQuestion) {
      return { error: "Failed to create question" };
    }

    // Link the question to the round
    await db.insert(roundTemplateQuestions).values({
      roundTemplateId: roundId,
      questionId: newQuestion.id,
    });

    revalidatePath("/questions");
    revalidatePath(`/rounds/${roundId}`);

    return { success: true, data: newQuestion };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create question" };
  }
};
