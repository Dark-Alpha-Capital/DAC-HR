"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { db, eq, desc } from "@workspace/db";
import { session as sessionsTable } from "@workspace/db/schema";

/**
 * Server Action to delete a candidate
 * Calls the backend API and invalidates Next.js cache tags
 */
export async function deleteCandidate(candidateId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    const response = await fetch(
      `/api/candidate/${candidateId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.session.token}`,
        },
      }
    );

    console.log("response", response);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to delete candidate");
    }

    // Invalidate cache tags immediately after successful deletion
    // This ensures the UI reflects the change right away
    updateTag("candidates"); // Invalidate the candidates list
    updateTag(`candidate-${candidateId}`); // Invalidate individual candidate page
    updateTag(`candidate-applications-${candidateId}`); // Invalidate candidate applications

    return { success: true };
  } catch (error) {
    console.error("Error deleting candidate:", error);

    return {
      error:
        error instanceof Error ? error.message : "Failed to delete candidate",
    };
  }
}
