import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/lib/middleware/auth-guard";
import { getDocumentUrl } from "@/lib/r2-storage";

export const Route = createFileRoute("/api/documents/view")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });

          const url = new URL(request.url);
          const key = url.searchParams.get("id") || url.searchParams.get("key");
          if (!key)
            return Response.json(
              { error: "Document key required" },
              { status: 400 },
            );

          const docUrl = await getDocumentUrl(key);
          if (!docUrl)
            return Response.json(
              { error: "Document not found" },
              { status: 404 },
            );

          return Response.json({ url: docUrl }, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to view document",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
