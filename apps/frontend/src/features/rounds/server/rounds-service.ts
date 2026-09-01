import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { roundTemplate } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  getFirstPositionIdForRoundTemplate,
  getPositions,
  getPositionsByRoundId,
  getQuestionsByRoundId,
  getRoundById,
  getRoundsByPositionId,
  getRoundsWithPositions,
} from "@workspace/db/repositories/position-repository";
import {
  roundFormSchema,
  roundEditFormSchema,
  type RoundFormSchema,
} from "../schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
  role?: string | null;
};

export type RoundFormData = RoundFormSchema;

export type RoundEditData = {
  name: string;
  description: string;
  positionId?: string;
};

type RoundsIndexInput = {
  type?: string[];
  page?: number;
};

export const roundsService = {
  async list(deps: RoundsIndexInput) {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, roundsResult] = await Promise.all([
      getPositions(),
      getRoundsWithPositions(deps.type, currentPage, limit),
    ]);

    const { rounds, total } = roundsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      rounds,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(deps.type?.length),
    };
  },

  async getNewOptions(position?: string) {
    const positionsResult = await getPositions();
    return {
      positions: positionsResult.positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      preSelectedPositionId: position ?? "",
    };
  },

  async getById(id: string) {
    const [round, positions, questions] = await Promise.all([
      getRoundById(id),
      getPositionsByRoundId(id),
      getQuestionsByRoundId(id),
    ]);
    return { round, positions, questions };
  },

  async getEdit(id: string) {
    const round = await getRoundById(id);
    return { round };
  },

  async getAddQuestionOptions(data: { roundId: string; position?: string }) {
    const round = await getRoundById(data.roundId);

    if (!round) {
      return {
        round: null,
        positions: [],
        rounds: [],
        preSelectedPositionId: "",
        preSelectedRoundId: data.roundId,
      };
    }

    const defaultPositionId = await getFirstPositionIdForRoundTemplate(
      data.roundId,
    );
    const positionId = data.position || defaultPositionId || "";
    const { positions } = await getPositions();
    const rounds = positionId
      ? (await getRoundsByPositionId(positionId)).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        }))
      : [];

    return {
      round,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      rounds,
      preSelectedPositionId: positionId,
      preSelectedRoundId: data.roundId,
    };
  },

  async getRoundsByPosition(positionId: string) {
    if (!positionId) {
      return [];
    }

    try {
      const rounds = await getRoundsByPositionId(positionId);
      return rounds.map((round) => ({
        id: round.id,
        name: round.name,
        description: round.description,
      }));
    } catch (error) {
      console.error("Error fetching rounds by position:", error);
      return [];
    }
  },

  async create(input: RoundFormData, actor: Actor) {
    const result = roundFormSchema.safeParse(input);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const { name, description, positionId } = result.data;

    try {
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
  },

  async update(roundId: string, data: RoundEditData, actor: Actor) {
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
  },

  async delete(id: string, actor: Actor) {
    try {
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
  },
};
