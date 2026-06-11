import { createFileRoute } from "@tanstack/react-router";
import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { candidateDocument as candidateDocumentSchema } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getSession } from "@/lib/middleware/auth-guard";

export const Route = createFileRoute(
  "/api/candidate/$id/documents/$documentId",
)({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const startTime = Date.now();
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          const { user } = authSession;

          const { id: candidateId, documentId } = params;
          if (!candidateId)
            return Response.json(
              { error: "Candidate ID is required" },
              { status: 400 },
            );
          if (!documentId)
            return Response.json(
              { error: "Document ID is required" },
              { status: 400 },
            );

          const [documentData] = await db
            .select()
            .from(candidateDocumentSchema)
            .where(eq(candidateDocumentSchema.id, documentId))
            .limit(1);

          if (!documentData)
            return Response.json(
              { error: "Document not found" },
              { status: 404 },
            );
          if (documentData.candidateId !== candidateId) {
            return Response.json(
              { error: "Document does not belong to this candidate" },
              { status: 403 },
            );
          }

          await db
            .delete(candidateDocumentSchema)
            .where(eq(candidateDocumentSchema.id, documentId));

          insertAuditLog({
            userId: user.id,
            action: "delete_candidate_document",
            entityType: "candidate_document",
            entityId: documentId,
            details: {
              candidateDocument: {
                id: documentData.id,
                candidateId: documentData.candidateId,
                name: documentData.name,
              },
              deletedBy: { id: user.id, email: user.email, name: user.name },
              metadata: { timestamp: new Date().toISOString() },
            },
          }).catch((err) => console.error("Audit log error:", err));

          return Response.json({ success: true }, { status: 200 });
        } catch (error) {
          console.error(
            `Error deleting document after ${Date.now() - startTime}ms:`,
            error,
          );
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to delete document",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
