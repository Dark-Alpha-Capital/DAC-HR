"use server";

import { db } from "@workspace/db";
import { roundTemplate, positionRoundTemplates } from "@workspace/db/schema";
import { RoundFormSchema, roundFormSchema } from "../schemas/round-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";

export const createRound = async (data: RoundFormSchema) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { error: "Only admins are allowed to create rounds" };
  }

  const result = roundFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, description, positionId } = result.data;

  try {
    // Create the round template
    const [newRound] = await db
      .insert(roundTemplate)
      .values({
        name,
        description: description || null,
      })
      .returning();

    if (!newRound) {
      return { error: "Failed to create round" };
    }

    // Create the link between position and round template
    await db.insert(positionRoundTemplates).values({
      positionId,
      roundTemplateId: newRound.id,
    });

    revalidatePath("/rounds");

    return { success: true, data: newRound };
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

    return { error: "Failed to create round" };
  }
};
