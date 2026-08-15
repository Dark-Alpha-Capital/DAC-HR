import { createFileRoute } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";
import { candidatesService } from "#/features/candidates/server/candidates-service";

export const Route = createFileRoute("/api/candidate/$id/ai-screening")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const candidateId = params.id;
          const url = new URL(request.url);
          const positionId = url.searchParams.get("positionId");
          const latest = url.searchParams.get("latest") === "true";

          if (!candidateId) {
            return Response.json(
              { error: "Candidate ID is required" },
              { status: 400 },
            );
          }

          if (latest) {
            const screening = await candidatesService.getLatestAiScreening(
              candidateId,
              positionId || undefined,
            );
            return Response.json({ screening }, { status: 200 });
          }

          const screenings = await candidatesService.getAiScreenings(
            candidateId,
            positionId || undefined,
          );
          return Response.json({ screenings }, { status: 200 });
        } catch (error) {
          console.error("Error fetching AI screenings", error);
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
