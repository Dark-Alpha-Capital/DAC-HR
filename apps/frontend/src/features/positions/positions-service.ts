import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { position } from "@workspace/db/schema";
import type { Department, HireLevel, PositionStatus } from "@workspace/db/enums";
import slugify from "slugify";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { createDefaultRoundsForPosition } from "@workspace/db/create-default-rounds";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export type PositionFormData = {
  name: string;
  description: string;
  department: Department[];
  hireLevel?: HireLevel | null;
  status?: PositionStatus | null;
};

export const createPosition = async (input: PositionFormData, actor: Actor) => {
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
};

export const updatePosition = async (
  positionId: string,
  input: PositionFormData,
  actor: Actor,
) => {
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
};

export const deletePosition = async (id: string, actor: Actor) => {
  try {
    // Get position data before deletion for audit log
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
};
