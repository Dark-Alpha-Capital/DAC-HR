"use server";

import { db } from "@workspace/db";
import { position } from "@workspace/db/schema";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export const deletePosition = async (id: string) => {
  // calling get session on the server
  const session = await auth.api.getSession({
    headers: await headers(), // some endpoints might require headers
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    await db.delete(position).where(eq(position.id, id));

    revalidatePath("/positions");

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete position" };
  }
};
