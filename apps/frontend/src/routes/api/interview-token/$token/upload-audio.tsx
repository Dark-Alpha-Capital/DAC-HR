import { createFileRoute } from "@tanstack/react-router";
import { getNextcloudClient, uploadFile as uploadToNextcloud } from "@workspace/nextcloud";
import {
  assertInterviewTokenValid,
  updateSessionVoiceMetadata,
} from "@workspace/db/repositories/interview-session-repository";

const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
];

export const Route = createFileRoute("/api/interview-token/$token/upload-audio")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const validation = await assertInterviewTokenValid(token);
          if (!validation.ok) {
            return Response.json({ error: validation.error }, { status: validation.status });
          }

          const formData = await request.formData();
          const file = formData.get("file");

          if (!(file instanceof File)) {
            return Response.json({ error: "No audio file provided" }, { status: 400 });
          }

          if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
            return Response.json(
              { error: "Unsupported audio format" },
              { status: 400 },
            );
          }

          const maxSize = 100 * 1024 * 1024;
          if (file.size > maxSize) {
            return Response.json(
              { error: "Audio file exceeds 100MB limit" },
              { status: 400 },
            );
          }

          const sessionId = validation.row.session.id;
          const folderPath = `/ATS/interviews/${sessionId}`;
          const client = getNextcloudClient();
          const uploadResult = await uploadToNextcloud({
            client,
            file,
            folderPath,
            fileName: "recording.webm",
          });

          if (!uploadResult.success || !uploadResult.downloadUrl) {
            return Response.json(
              { error: "Failed to upload audio recording" },
              { status: 500 },
            );
          }

          await updateSessionVoiceMetadata(sessionId, {
            sessionAudioUrl: uploadResult.downloadUrl,
            sessionAudioPath: uploadResult.filePath ?? null,
          });

          return Response.json({
            url: uploadResult.downloadUrl,
            path: uploadResult.filePath,
          });
        } catch (error) {
          console.error("Error uploading interview audio:", error);
          return Response.json(
            { error: "Failed to upload audio recording" },
            { status: 500 },
          );
        }
      },
    },
  },
});
