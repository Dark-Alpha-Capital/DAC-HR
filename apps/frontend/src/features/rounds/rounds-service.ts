import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { roundTemplate } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getRoundById } from "@workspace/db/modules/positions";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type RoundFormData = {
  name: string;
  description?: string | null;
  positionId: string;
};

export const createRound = async (input: RoundFormData, actor: Actor) => {
  const { name, description, positionId } = input;

  try {
    // Create the round template
    const [newRound] = await db
      .insert(roundTemplate)
      .values({
        positionId,
        name,
        description: description || null,
      })
      .returning();

    if (!newRound) {
      return { error: "Failed to create round" };
    }

    insertAuditLog({
      userId: actor.id,
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
          positionId: positionId || null,
        },
        createdBy: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
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
};

export type RoundEditData = {
  name: string;
  description: string;
  positionId?: string;
};

export const updateRound = async (
  roundId: string,
  data: RoundEditData,
  actor: Actor,
) => {
  const { name, description } = data;

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
      userId: actor.id,
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
          id: actor.id,
          email: actor.email,
          name: actor.name,
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
};

export const deleteRound = async (id: string, actor: Actor) => {
  try {
    // Get round data before deletion for audit log
    const roundData = await getRoundById(id);

    await db.delete(roundTemplate).where(eq(roundTemplate.id, id));
    if (roundData) {
      insertAuditLog({
        userId: actor.id,
        action: "delete_round",
        entityType: "round",
        entityId: id,
        details: {
          round: {
            id: roundData.id,
            name: roundData.name,
            description: roundData.description,
          },
          deletedBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));
    }

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete round" };
  }
};
