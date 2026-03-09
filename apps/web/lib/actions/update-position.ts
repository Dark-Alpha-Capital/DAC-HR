"use server";

import { db } from "@workspace/db";
import { position } from "@workspace/db/schema";
import slugify from "slugify";
import {
  PositionFormSchema,
  positionFormSchema,
} from "../schemas/position-form-schema";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "@workspace/db";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updatePosition = async (
  positionId: string,
  data: PositionFormSchema,
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { error: "Only admins are allowed to update positions" };
  }

  const result = positionFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, description, department, hireLevel, status } = result.data;

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

    updateTag("positions");
    revalidatePath("/positions");
    revalidatePath(`/positions/${updatedPosition.slug}`);
    revalidatePath(`/positions/${updatedPosition.slug}/edit`);

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
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

    return { success: true, data: updatedPosition };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update position" };
  }
};
