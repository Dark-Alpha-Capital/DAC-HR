"use server";

import { db } from "@workspace/db";
import { roundTemplate } from "@workspace/db/schema";
import {
  RoundFormSchema,
  roundFormSchema,
  roundEditFormSchema,
} from "../schemas/round-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export const updateRound = async (
  roundId: string,
  data:
    | RoundFormSchema
    | { name: string; description: string; positionId?: string }
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  // Use edit schema for validation since we only update name and description
  const result = roundEditFormSchema.safeParse({
    name: data.name,
    description: data.description,
  });
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, description } = result.data;

  try {
    const [updatedRound] = await db
      .update(roundTemplate)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(roundTemplate.id, roundId))
      .returning();

    if (!updatedRound) {
      return { error: "Round not found" };
    }

    revalidatePath("/rounds");
    revalidatePath(`/rounds/${updatedRound.id}`);
    revalidatePath(`/rounds/${updatedRound.id}/edit`);

    return { success: true, data: updatedRound };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      // Check if it's a unique constraint violation
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        return { error: "A round with this name already exists." };
      }
      return { error: error.message };
    }

    return { error: "Failed to update round" };
  }
};
