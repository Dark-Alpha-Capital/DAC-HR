"use server";

import { db } from "@workspace/db";
import { position } from "@workspace/db/schema";
import slugify from "slugify";
import {
  PositionFormSchema,
  positionFormSchema,
} from "../schemas/position-form-schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";

export const createPosition = async (data: PositionFormSchema) => {
  console.log("data", data);

  const session = await auth.api.getSession({
    headers: await headers(), // some endpoints might require headers
  });

  if (!session?.user) {
    console.log("unauthorized");

    return { error: "Unauthorized" };
  }

  if (session.user.role !== "admin") {
    return { error: "Only admins are allowed to create positions" };
  }

  const result = positionFormSchema.safeParse(data);
  console.log("result", result);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, description, department, hireLevel, status } = result.data;

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

    console.log("new position created", newPosition);

    revalidatePath("/positions");

    after(async () => {
      await insertAuditLog({
        userId: session.user.id,
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

    return { success: true, data: newPosition };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create position" };
  }
};
