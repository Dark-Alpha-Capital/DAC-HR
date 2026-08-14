import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "#/lib/get-session";
import { getAllScreeners } from "@workspace/db/repositories/screener-repository";

export const Route = createFileRoute("/api/screeners")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const screeners = await getAllScreeners();
          return Response.json(
            {
              screeners: screeners.map((s) => ({
                id: s.id,
                name: s.name,
                positionId: s.positionId,
              })),
            },
            { status: 200 },
          );
        } catch (error) {
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
