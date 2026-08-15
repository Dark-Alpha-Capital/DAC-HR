import { createFileRoute } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";
import { candidatesService } from "#/features/candidates/server/candidates-service";

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

          const result = await candidatesService.deleteDocument(
            candidateId,
            documentId,
            user,
          );

          if (result.error) {
            const status =
              result.error === "Document not found" ? 404 : 403;
            return Response.json({ error: result.error }, { status });
          }

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
