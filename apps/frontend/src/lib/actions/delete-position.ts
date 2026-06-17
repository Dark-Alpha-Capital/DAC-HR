import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { position } from "@workspace/db/schema";

import { getSession } from "~/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const deletePosition = createServerFn({ method: "POST" })
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
  // calling get session on the server
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { error: "Only admins are allowed to delete positions" };
  }

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
          userId: session.user.id,
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

    return { error: "Failed to delete position" };
  }
});
