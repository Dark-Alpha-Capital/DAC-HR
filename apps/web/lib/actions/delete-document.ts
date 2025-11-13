"use server";

import { db } from "@workspace/db";
import { documents } from "@workspace/db/schema";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export const deleteDocument = async (id: string) => {
  // calling get session on the server
  const session = await auth.api.getSession({
    headers: await headers(), // some endpoints might require headers
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    await db.delete(documents).where(eq(documents.id, id));

    revalidatePath("/documents");

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete document" };
  }
};

