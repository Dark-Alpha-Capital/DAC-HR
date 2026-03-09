"use server";

import { auth } from "@/auth";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { deleteCandidateWithAssets } from "@/lib/application/candidate-service";

/**
 * Server Action to delete a candidate
 * Uses shared application service and invalidates Next.js cache tags
 */
export async function deleteCandidate(candidateId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  try {
    const deleteResult = await deleteCandidateWithAssets(candidateId);
    if (!deleteResult) {
      return { error: "Candidate not found" };
    }

    const { candidate, deletedDocuments } = deleteResult;

    insertAuditLog({
      userId: session.user.id,
      action: "delete_candidate",
      entityType: "candidate",
      entityId: candidateId,
      details: {
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone || null,
          location: candidate.location || null,
          source: candidate.source || null,
          sourceUrl: candidate.sourceUrl || null,
          note: candidate.note || null,
          createdAt: candidate.createdAt.toISOString(),
          updatedAt: candidate.updatedAt.toISOString(),
        },
        deletedDocuments: deletedDocuments.map((doc) => ({
          id: doc.id,
          name: doc.name,
          url: doc.url,
          fileSearchDocumentName: doc.fileSearchDocumentName || null,
        })),
        deletedBy: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          documentsDeleted: deletedDocuments.length,
          deletedFrom: "server_action",
        },
      },
    }).catch((error) => {
      console.error("Error inserting delete candidate audit log:", error);
    });

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
