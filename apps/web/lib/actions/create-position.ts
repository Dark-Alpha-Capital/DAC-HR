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

  const { name, description, department, hireLevel } = result.data;

  try {
    const [newPosition] = await db
      .insert(position)
      .values({
        name,
        slug: slugify(name, { lower: true, strict: true }),
        description,
        department,
        hireLevel: hireLevel || null,
      })
      .returning();

    console.log("new position created", newPosition);

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
