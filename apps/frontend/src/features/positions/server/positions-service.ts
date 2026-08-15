import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { position } from "@workspace/db/schema";
import type { Department, HireLevel, PositionStatus } from "#/lib/enums";
import slugify from "slugify";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { createDefaultRoundsForPosition } from "@workspace/db/create-default-rounds";
import {
  getCandidatesByPositionId,
  getPositionBySlug,
  getPositions,
  getRoundsByPositionId,
} from "@workspace/db/modules/positions";
import { getScreenerByPositionId } from "@workspace/db/repositories/screener-repository";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
  role?: string | null;
};

export type PositionFormData = {
  name: string;
  description: string;
  department: Department[];
  hireLevel?: HireLevel | null;
  status?: PositionStatus | null;
};

type PositionsIndexInput = {
  search?: string;
  hireLevel?: string[];
  status?: string[];
  page?: number;
};

export const positionsService = {
  async list(deps: PositionsIndexInput) {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const { positions, total } = await getPositions(
      deps.hireLevel,
      deps.status,
      currentPage,
      limit,
      deps.search,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      positions,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.search?.trim() || deps.hireLevel?.length || deps.status?.length,
      ),
    };
  },

  async getBySlug(slug: string) {
    const position = await getPositionBySlug(slug);

    if (!position) {
      return { position: null, rounds: [], candidates: [], screener: null };
    }

    const [rounds, candidates, screener] = await Promise.all([
      getRoundsByPositionId(position.id),
      getCandidatesByPositionId(position.id),
      getScreenerByPositionId(position.id),
    ]);

    return { position, rounds, candidates, screener };
  },

  async getEdit(slug: string) {
    const position = await getPositionBySlug(slug);
    return { position };
  },

  async getOptions() {
    const { positions } = await getPositions(undefined, undefined, 1, 200);
    return positions.map((p) => ({ id: p.id, name: p.name }));
  },

  async create(input: PositionFormData, actor: Actor) {
    if (actor.role !== "admin") {
      return { error: "Only admins are allowed to create positions" };
    }

    const { name, description, department, hireLevel, status } = input;

    try {
      const [newPosition] = await db
        .insert(position)
        .values({
          name,
          slug: slugify(name, { lower: true, strict: true }),
          description,
          department,
          hireLevel: hireLevel || null,
          status: status || "active",
        })
        .returning();

      if (!newPosition) {
        return { error: "Failed to create position" };
      }

      await createDefaultRoundsForPosition(newPosition.id);

      insertAuditLog({
        userId: actor.id,
        action: "create_position",
        entityType: "position",
        entityId: newPosition.id,
        details: {
          position: {
            id: newPosition.id,
            name: newPosition.name,
            slug: newPosition.slug,
            description: newPosition.description,
            department: newPosition.department,
            hireLevel: newPosition.hireLevel,
            status: newPosition.status,
            createdAt: newPosition.createdAt.toISOString(),
            updatedAt: newPosition.updatedAt.toISOString(),
          },
          input: {
            name,
            description,
            department,
            hireLevel: hireLevel || null,
            status: status || "active",
          },
          createdBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: newPosition };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to create position" };
    }
  },

  async update(positionId: string, input: PositionFormData, actor: Actor) {
    if (actor.role !== "admin") {
      return { error: "Only admins are allowed to update positions" };
    }

    const { name, description, department, hireLevel, status } = input;

    try {
      const [updatedPosition] = await db
        .update(position)
        .set({
          name,
          slug: slugify(name, { lower: true, strict: true }),
          description,
          department,
          hireLevel: hireLevel || null,
          status: status || "active",
          updatedAt: new Date(),
        })
        .where(eq(position.id, positionId))
        .returning();

      if (!updatedPosition) {
        return { error: "Position not found" };
      }
      insertAuditLog({
        userId: actor.id,
        action: "update_position",
        entityType: "position",
        entityId: updatedPosition.id,
        details: {
          position: {
            id: updatedPosition.id,
            name: updatedPosition.name,
            slug: updatedPosition.slug,
            description: updatedPosition.description,
            department: updatedPosition.department,
            hireLevel: updatedPosition.hireLevel,
            status: updatedPosition.status,
            updatedAt: updatedPosition.updatedAt.toISOString(),
          },
          input: {
            name,
            description,
            department,
            hireLevel: hireLevel || null,
            status: status || "active",
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

      return { success: true, data: updatedPosition };
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to update position" };
    }
  },

  async delete(id: string, actor: Actor) {
    if (actor.role !== "admin") {
      return { error: "Only admins are allowed to delete positions" };
    }

    try {
      const [positionData] = await db
        .select()
        .from(position)
        .where(eq(position.id, id))
        .limit(1);

      await db.delete(position).where(eq(position.id, id));

      if (positionData) {
        insertAuditLog({
          userId: actor.id,
          action: "delete_position",
          entityType: "position",
          entityId: id,
          details: {
            position: {
              id: positionData.id,
              name: positionData.name,
              slug: positionData.slug,
              description: positionData.description,
              department: positionData.department,
              hireLevel: positionData.hireLevel,
              status: positionData.status,
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

      return { error: "Failed to delete position" };
    }
  },
};
