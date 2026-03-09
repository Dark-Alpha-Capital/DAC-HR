"use server";

import { db } from "@workspace/db";
import { roundTemplate, positionRoundTemplates } from "@workspace/db/schema";
import { RoundFormSchema, roundFormSchema } from "../schemas/round-form-schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

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
    // Invalidate cache for all applications using this position
    updateTag(`position-${positionId}`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
        action: "create_round",
        entityType: "round",
        entityId: newRound.id,
        details: {
          round: {
            id: newRound.id,
            name: newRound.name,
            description: newRound.description,
            createdAt: newRound.createdAt.toISOString(),
            updatedAt: newRound.updatedAt.toISOString(),
          },
          input: {
            name,
            description: description || null,
            positionId,
          },
          createdBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            linkedToPosition: !!positionId,
          },
        },
      });
    });

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
