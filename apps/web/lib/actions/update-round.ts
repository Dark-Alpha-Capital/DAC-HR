import { defineAction, defineArgsAction } from "./create-action";
import { db } from "@workspace/db/db";
import { roundTemplate } from "@workspace/db/schema";
import {
  RoundFormSchema,
  roundFormSchema,
  roundEditFormSchema,
} from "../schemas/round-form-schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updateRound = defineArgsAction(async (
  roundId: string,
  data:
    | RoundFormSchema
    | { name: string; description: string; positionId?: string },
) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { error: "Only admins are allowed to update rounds" };
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
    insertAuditLog({
        userId: session.user.id,
        action: "update_round",
        entityType: "round",
        entityId: updatedRound.id,
        details: {
          round: {
            id: updatedRound.id,
            name: updatedRound.name,
            description: updatedRound.description,
            updatedAt: updatedRound.updatedAt.toISOString(),
          },
          input: {
            name,
            description: description || null,
          },
          updatedBy: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

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
});