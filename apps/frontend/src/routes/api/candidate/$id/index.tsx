import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "#/lib/get-session";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { deleteCandidateWithAssets } from "#/features/candidates/candidates-service";

export const Route = createFileRoute("/api/candidate/$id/")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json(
              { success: false, message: "Unauthorized" },
              { status: 401 },
            );
          }
          const { user } = authSession;

          const candidateId = params.id;
          if (!candidateId || candidateId.trim() === "") {
            return Response.json(
              { error: "Candidate ID is required" },
              { status: 400 },
            );
          }

          const deleteResult = await deleteCandidateWithAssets(candidateId);
          if (!deleteResult) {
            return Response.json(
              { error: "Candidate not found" },
              { status: 404 },
            );
          }

          const {
            candidate: candidateData,
            deletedDocuments: candidateDocuments,
          } = deleteResult;

          insertAuditLog({
            userId: user.id,
            action: "delete_candidate",
            entityType: "candidate",
            entityId: candidateId,
            details: {
              candidate: {
                id: candidateData.id,
                firstName: candidateData.firstName,
                lastName: candidateData.lastName,
                email: candidateData.email,
                phone: candidateData.phone || null,
                location: candidateData.location || null,
                source: candidateData.source || null,
                sourceUrl: candidateData.sourceUrl || null,
                note: candidateData.note || null,
                createdAt: candidateData.createdAt.toISOString(),
                updatedAt: candidateData.updatedAt.toISOString(),
              },
              deletedDocuments: candidateDocuments.map((doc) => ({
                id: doc.id,
                name: doc.name,
                url: doc.url,
                fileSearchDocumentName: doc.fileSearchDocumentName || null,
              })),
              deletedBy: { id: user.id, email: user.email, name: user.name },
              metadata: {
                timestamp: new Date().toISOString(),
                documentsDeleted: candidateDocuments.length,
              },
            },
          }).catch((error) =>
            console.error("Error inserting audit log:", error),
          );

          return Response.json({ success: true }, { status: 200 });
        } catch (error) {
          console.error(
            `Error deleting candidate after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to delete candidate",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
