import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItemsByCandidateId,
  updateChecklistItem,
} from "@workspace/db/repositories/candidate-checklist-repository";

type ChecklistItemInput = {
  id?: string;
  label: string;
  checked: boolean;
};

export const updateChecklistItems = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, ChecklistItemInput[]]) => data)
  .handler(
    async ({ data: [candidateId, items], context: { session } }) => {
      try {
        const keptIds = new Set(
          items.filter((item) => item.id).map((item) => item.id as string),
        );

        const existing = await getChecklistItemsByCandidateId(candidateId);

        await Promise.all(
          items.map(async (item) => {
            if (item.id) {
              await updateChecklistItem(item.id, {
                label: item.label,
                checked: item.checked,
              });
            } else if (item.label.trim()) {
              await createChecklistItem({
                candidateId,
                label: item.label.trim(),
              });
            }
          }),
        );

        await Promise.all(
          existing
            .filter((item) => !keptIds.has(item.id))
            .map((item) => deleteChecklistItem(item.id)),
        );

        insertAuditLog({
          userId: session.user.id,
          action: "update_checklist",
          entityType: "candidate_checklist",
          entityId: candidateId,
          details: {
            items,
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

        return { success: true as const };
      } catch (error) {
        console.error("Error updating checklist items:", error);
        return {
          success: false as const,
          error: "Failed to update checklist",
        };
      }
    },
  );
