import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { roundTemplate } from "@workspace/db/schema";

import { getSession } from "~/lib/get-session";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getRoundById } from "@workspace/db/queries";

export const deleteRound = createServerFn({ method: "POST" })
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { error: "Only admins are allowed to delete rounds" };
  }

  try {
    // Get round data before deletion for audit log
    const roundData = await getRoundById(id);

    await db.delete(roundTemplate).where(eq(roundTemplate.id, id));
    if (roundData) {
      insertAuditLog({
          userId: session.user.id,
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
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
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
});
