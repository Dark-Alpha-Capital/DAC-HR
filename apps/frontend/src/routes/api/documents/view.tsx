import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "~/lib/get-session";
import { getSignedUrl } from "~/lib/storage";

export const Route = createFileRoute("/api/documents/view")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user)
            return Response.json({ error: "Unauthorized" }, { status: 401 });

          const searchParams = new URL(request.url).searchParams;
          const url = searchParams.get("url");

          if (!url) {
            return Response.json(
              { error: "Document URL is required" },
              { status: 400 },
            );
          }

          const signedUrl = await getSignedUrl(url, 60);

          if (!signedUrl) {
            return Response.json(
              { error: "Failed to generate access URL" },
              { status: 500 },
            );
          }

          return Response.json({ url: signedUrl }, { status: 200 });
        } catch (error) {
          console.error("Error generating signed URL:", error);
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
