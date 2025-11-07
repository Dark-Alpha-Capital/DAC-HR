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
import { eq } from "drizzle-orm";

export const updatePosition = async (
  positionId: string,
  data: PositionFormSchema
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const result = positionFormSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { name, description } = result.data;

  try {
    const [updatedPosition] = await db
      .update(position)
      .set({
        name,
        slug: slugify(name, { lower: true, strict: true }),
        description,
        updatedAt: new Date(),
      })
      .where(eq(position.id, positionId))
      .returning();

    if (!updatedPosition) {
      return { error: "Position not found" };
    }

    revalidatePath("/positions");
    revalidatePath(`/positions/${updatedPosition.slug}`);
    revalidatePath(`/positions/${updatedPosition.slug}/edit`);

    return { success: true, data: updatedPosition };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update position" };
  }
};

