"use server";

import { db } from "@workspace/db";
import { candidate } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export const deleteCandidate = async (id: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    await db.delete(candidate).where(eq(candidate.id, id));

    revalidatePath("/candidates");

    return { success: true };
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete candidate" };
  }
};

