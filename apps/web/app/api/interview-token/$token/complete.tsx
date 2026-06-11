import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionByToken, updateSessionStatus } from "@workspace/db/repositories/interview-session-repository";

const completeSchema = z.object({
  tabSwitches: z.number().int().min(0).default(0),
});

export const Route = createFileRoute("/api/interview-token/$token/complete")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const row = await getSessionByToken(token);

          if (!row) {
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );
          }

          const { session } = row;

          if (session.status === "completed" || session.status === "reviewed") {
            return Response.json(
              { error: "This interview has already been completed" },
              { status: 410 },
            );
          }

          const body = await request.json();
          const parsed = completeSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const updated = await updateSessionStatus(session.id, "completed", {
            completedAt: new Date(),
            tabSwitches: parsed.data.tabSwitches,
          });

          return Response.json({ session: updated });
        } catch (error) {
          console.error("Error completing interview:", error);
          return Response.json(
            { error: "Failed to complete interview" },
            { status: 500 },
          );
        }
      },
    },
  },
});
