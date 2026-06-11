import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSession } from "@/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createSession,
  getAllSessions,
} from "@workspace/db/repositories/interview-session-repository";

const createSchema = z.object({
  applicationId: z.string().min(1),
  roundId: z.string().min(1),
  expiryHours: z.number().min(1).max(720).default(72),
});

export const Route = createFileRoute("/api/interview-sessions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await getSession();
          if (!session?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          if (session.user.role !== "admin") {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const body = await request.json();
          const parsed = createSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.flatten().fieldErrors },
              { status: 400 },
            );
          }

          const { applicationId, roundId, expiryHours } = parsed.data;
          const expiresAt = new Date(
            Date.now() + expiryHours * 60 * 60 * 1000,
          );

          const newSession = await createSession({
            applicationId,
            roundId,
            expiresAt,
          });

          if (!newSession) {
            return Response.json(
              { error: "Failed to create session" },
              { status: 500 },
            );
          }

          insertAuditLog({
            userId: session.user.id,
            action: "create_interview_session",
            entityType: "interview_session",
            entityId: newSession.id,
            details: {
              session: {
                id: newSession.id,
                applicationId,
                roundId,
                expiresAt: expiresAt.toISOString(),
              },
              createdBy: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
              },
            },
          }).catch((error) => console.error("Audit log error:", error));

          const interviewLink = `${new URL(request.url).origin}/interview/${newSession.token}`;

          return Response.json({
            session: newSession,
            interviewLink,
          });
        } catch (error) {
          console.error("Error creating interview session:", error);
          return Response.json(
            { error: "Failed to create interview session" },
            { status: 500 },
          );
        }
      },
      GET: async () => {
        try {
          const session = await getSession();
          if (!session?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          if (session.user.role !== "admin") {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const sessions = await getAllSessions();
          return Response.json({ sessions });
        } catch (error) {
          console.error("Error fetching interview sessions:", error);
          return Response.json(
            { error: "Failed to fetch interview sessions" },
            { status: 500 },
          );
        }
      },
    },
  },
});
