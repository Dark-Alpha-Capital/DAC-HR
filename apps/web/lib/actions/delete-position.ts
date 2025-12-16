"use server";

import { db } from "@workspace/db";
import { position } from "@workspace/db/schema";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";
import { getPositionBySlug } from "@workspace/db/queries";

export const deletePosition = async (id: string) => {
  // calling get session on the server
  const session = await auth.api.getSession({
    headers: await headers(), // some endpoints might require headers
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get position data before deletion for audit log
    const [positionData] = await db
      .select()
      .from(position)
      .where(eq(position.id, id))
      .limit(1);

    await db.delete(position).where(eq(position.id, id));

    updateTag("positions");
    revalidatePath("/positions");

    if (positionData) {
      after(async () => {
        await insertAuditLog({
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
        });
      });
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
