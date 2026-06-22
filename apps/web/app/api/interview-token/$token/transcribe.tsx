import { createFileRoute } from "@tanstack/react-router";
import { getSessionByToken } from "@workspace/db/repositories/interview-session-repository";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/interview-token/$token/transcribe")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { token } = params;

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const row = await getSessionByToken(token);

          if (!row) {
            return Response.json({ error: "Interview not found" }, { status: 404 });
          }

          if (
            row.session.status === "completed" ||
            row.session.status === "reviewed"
          ) {
            return Response.json(
              { error: "This interview has already been completed" },
              { status: 410 },
            );
          }

          // Parse the multipart/form-data upload from VoiceRecorder
          let formData: FormData;
          try {
            formData = await request.formData();
          } catch {
            return Response.json(
              { error: "Invalid request body" },
              { status: 400 },
            );
          }

          const audioFile = formData.get("audio");
          if (!audioFile || !(audioFile instanceof File)) {
            return Response.json(
              { error: "Audio file is required" },
              { status: 400 },
            );
          }

          // Convert File → ArrayBuffer → number[] (what Whisper expects)
          const arrayBuffer = await audioFile.arrayBuffer();
          const audio = [...new Uint8Array(arrayBuffer)];

          if (audio.length === 0) {
            return Response.json(
              { error: "Audio file is empty" },
              { status: 400 },
            );
          }

          const result = await env.AI.run("@cf/openai/whisper", { audio });

          return Response.json({ text: result.text ?? "" });
        } catch (error) {
          console.error("Transcription error:", error);
          return Response.json(
            { error: "Transcription failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
