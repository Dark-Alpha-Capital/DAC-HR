import {
  createScreener,
  deleteScreener,
  getAllScreeners,
  getScreenerById,
  updateScreener,
} from "@workspace/db/repositories/screener-repository";
import { getPositions } from "@workspace/db/modules/positions";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import type {
  ScreenerFormSchema,
  ScreenerEditSchema,
} from "../schemas";

export const screenersService = {
  async list() {
    const screeners = await getAllScreeners();
    return { screeners };
  },

  async getFormOptions() {
    const { positions } = await getPositions();
    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
    };
  },

  async getById(id: string) {
    const screener = await getScreenerById(id);
    return { screener };
  },

  async create(userId: string, data: ScreenerFormSchema) {
    const newScreener = await createScreener({
      name: data.name,
      content: data.content,
      positionId: data.positionId,
      createdBy: userId,
    });

    if (!newScreener) {
      return { error: "Failed to create screener" };
    }

    insertAuditLog({
      userId,
      action: "create_screener",
      entityType: "screener",
      entityId: newScreener.id,
      details: {
        screener: { id: newScreener.id, name: newScreener.name },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { data: newScreener };
  },

  async update(id: string, userId: string, data: ScreenerEditSchema) {
    const updated = await updateScreener(id, {
      name: data.name,
      content: data.content,
      positionId: data.positionId?.trim() ? data.positionId : null,
    });

    if (!updated) {
      return { error: "Screener not found" };
    }

    insertAuditLog({
      userId,
      action: "update_screener",
      entityType: "screener",
      entityId: id,
      details: { screener: { id, name: data.name, positionId: data.positionId } },
    }).catch((error) => console.error("Audit log error:", error));

    return { data: updated };
  },

  async remove(id: string, userId: string) {
    const screenerData = await getScreenerById(id);
    const deleted = await deleteScreener(id);

    if (!deleted) {
      return { error: "Screener not found" };
    }

    if (screenerData) {
      insertAuditLog({
        userId,
        action: "delete_screener",
        entityType: "screener",
        entityId: id,
        details: {
          screener: { id: screenerData.id, name: screenerData.name },
        },
      }).catch((error) => console.error("Audit log error:", error));
    }

    return { success: true };
  },
};
