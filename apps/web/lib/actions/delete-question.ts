"use server";

import { db } from "@workspace/db";
import { questionBank } from "@workspace/db/schema";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export const deleteQuestion = async (id: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    await db.delete(questionBank).where(eq(questionBank.id, id));

    revalidatePath("/questions");

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete question" };
  }
};

