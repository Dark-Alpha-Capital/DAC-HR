"use server";

import { db } from "@workspace/db";
import { candidate } from "@workspace/db/schema";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { insertAuditLog } from "@workspace/db/queries";
import { getCandidateById } from "@workspace/db/queries";

export const deleteCandidate = async (id: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    // Get candidate data before deletion for audit log
    const candidateData = await getCandidateById(id);

    await db.delete(candidate).where(eq(candidate.id, id));

    revalidatePath("/candidates");

    if (candidateData) {
      after(async () => {
        await insertAuditLog({
          userId: session.user.id,
          action: "delete_candidate",
          entityType: "candidate",
          entityId: id,
          details: {
            candidate: {
              id: candidateData.id,
              firstName: candidateData.firstName,
              lastName: candidateData.lastName,
              email: candidateData.email,
              phone: candidateData.phone,
              location: candidateData.location,
              source: candidateData.source,
              sourceUrl: candidateData.sourceUrl,
              note: candidateData.note,
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
    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete candidate" };
  }
};
