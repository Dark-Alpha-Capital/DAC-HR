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

export const createPosition = async (data: PositionFormSchema) => {
  const session = await auth.api.getSession({
    headers: await headers(), // some endpoints might require headers
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
    const [newPosition] = await db
      .insert(position)
      .values({
        name,
        slug: slugify(name, { lower: true, strict: true }),
        description,
      })
      .returning();

    revalidatePath("/positions");

    return { success: true, data: newPosition };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create position" };
  }
};
