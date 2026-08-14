import { createFileRoute } from "@tanstack/react-router";
import { handleRecordingUpload } from "#/features/voice-interview/interview-recording-upload";

/**
 * The recording upload is normally handled in server.ts with `ctx.waitUntil`
 * (background Nextcloud upload). This route is a fallback for environments
 * where the server entry doesn't intercept — it uploads inline.
 */
export const Route = createFileRoute("/api/interview-token/$token/upload-audio")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        return handleRecordingUpload(request, params.token);
      },
    },
  },
});
