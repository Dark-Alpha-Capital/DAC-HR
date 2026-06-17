import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { roundTemplate, positionRoundTemplates } from "@workspace/db/schema";
import { RoundFormSchema, roundFormSchema } from "../schemas/round-form-schema";
import { getSession } from "~/lib/get-session";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const createRound = createServerFn({ method: "POST" })
  .validator((data: RoundFormSchema) => data)
  .handler(async ({ data }) => {
    const session = await getSession();

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
      // Invalidate cache for all applications using this position
      insertAuditLog({
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
      }).catch((error) => console.error("Audit log error:", error));

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
  });