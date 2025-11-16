"use server";

import { db } from "@workspace/db";
import { questionBank } from "@workspace/db/schema";
import {
  QuestionFormSchema,
  questionFormSchema,
} from "../schemas/question-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export const updateQuestion = async (
  questionId: string,
  data: QuestionFormSchema
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

    revalidatePath("/questions");
    revalidatePath(`/questions/${updatedQuestion.id}`);
    revalidatePath(`/questions/${updatedQuestion.id}/edit`);

    return { success: true, data: updatedQuestion };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update question" };
  }
};

