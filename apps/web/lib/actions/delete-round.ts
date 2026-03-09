"use server";

import { db } from "@workspace/db";
import { roundTemplate } from "@workspace/db/schema";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getRoundById } from "@workspace/db/queries";

export const deleteRound = async (id: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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

    revalidatePath("/rounds");

    if (roundData) {
      after(async () => {
        await insertAuditLog({
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
        });
      });
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
