import { createFileRoute } from "@tanstack/react-router";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getSession } from "~/lib/middleware/auth-guard";
import { deleteCandidateWithAssets } from "~/lib/application/candidate-service";

export const Route = createFileRoute("/api/candidate/bulk")({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
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

          let body: { candidateIds: string[] };
          try {
            body = await request.json();
          } catch {
            return Response.json(
              {
                error:
                  "Invalid request body. Expected JSON with candidateIds array.",
              },
              { status: 400 },
            );
          }

          const { candidateIds } = body;
          if (
            !candidateIds ||
            !Array.isArray(candidateIds) ||
            candidateIds.length === 0
          ) {
            return Response.json(
              { error: "candidateIds array is required and must not be empty" },
              { status: 400 },
            );
          }

          const results: Array<{
            id: string;
            success: boolean;
            error?: string;
          }> = [];
          for (const candidateId of candidateIds) {
            try {
              if (!candidateId || candidateId.trim() === "") {
                results.push({
                  id: candidateId,
                  success: false,
                  error: "Invalid candidate ID",
                });
                continue;
              }
              const deleteResult = await deleteCandidateWithAssets(candidateId);
              if (!deleteResult) {
                results.push({
                  id: candidateId,
                  success: false,
                  error: "Candidate not found",
                });
                continue;
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
                  },
                  deletedBy: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                  },
                  metadata: {
                    timestamp: new Date().toISOString(),
                    documentsDeleted: candidateDocuments.length,
                    bulkDelete: true,
                  },
                },
              }).catch((error) =>
                console.error("Error inserting audit log:", error),
              );
              results.push({ id: candidateId, success: true });
            } catch (error) {
              results.push({
                id: candidateId,
                success: false,
                error: error instanceof Error ? error.message : "Failed",
              });
            }
          }

          const successCount = results.filter((r) => r.success).length;
          const failedCount = results.filter((r) => !r.success).length;
          return Response.json(
            {
              success: failedCount === 0,
              deleted: successCount,
              failed: failedCount,
              results,
            },
            { status: failedCount === 0 ? 200 : 207 },
          );
        } catch (error) {
          console.error(
            `Error processing bulk delete after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            { error: error instanceof Error ? error.message : "Failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
