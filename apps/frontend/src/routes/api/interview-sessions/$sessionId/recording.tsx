import { createFileRoute } from "@tanstack/react-router";
import { downloadFile } from "@workspace/nextcloud";
import { getSessionById } from "@workspace/db/repositories/interview-session-repository";
import { fetchSession as getSession } from "#/lib/auth-session";
import { getServerNextcloudClient } from "#/lib/nextcloud-server";

export const Route = createFileRoute(
  "/api/interview-sessions/$sessionId/recording",
)({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const authSession = await getSession();
          if (!authSession?.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const sessionRow = await getSessionById(params.sessionId);
          if (!sessionRow) {
            return Response.json({ error: "Session not found" }, { status: 404 });
          }

          const filePathOrUrl =
            sessionRow.session.sessionAudioPath ??
            sessionRow.session.sessionAudioUrl;

          if (!filePathOrUrl) {
            return Response.json(
              { error: "No recording available for this session" },
              { status: 404 },
            );
          }

          const client = getServerNextcloudClient();
          const downloadResult = await downloadFile({
            client,
            filePathOrUrl,
          });

          if (!downloadResult.success || !downloadResult.buffer) {
            return Response.json(
              { error: downloadResult.error ?? "Failed to load recording" },
              { status: 500 },
            );
          }

          const download =
            new URL(request.url).searchParams.get("download") === "1";

          return new Response(new Uint8Array(downloadResult.buffer), {
            status: 200,
            headers: {
              "Content-Type": "video/webm",
              "Content-Length": String(downloadResult.buffer.length),
              "Cache-Control": "private, max-age=3600",
              ...(download
                ? {
                    "Content-Disposition":
                      'attachment; filename="screen-recording.webm"',
                  }
                : {}),
            },
          });
        } catch (error) {
          console.error("Error streaming interview recording:", error);
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to load recording",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
