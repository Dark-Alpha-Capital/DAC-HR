import handler from "@tanstack/react-start/server-entry";
import { handleInterviewRealtimeWs } from "#/features/voice-interview/ws-handler";
import { handleRecordingUpload } from "#/features/voice-interview/interview-recording-upload";
import { handleAsyncJobQueue } from "#/lib/queues/consume";

export { DocumentIndexingWorkflow } from "./workflows/document-indexing";
export { InterviewEvaluationWorkflow } from "./workflows/interview-evaluation";
export { CandidateImportWorkflow } from "./workflows/candidate-import";
export { InterviewSessionDO } from "./durable-objects/interview-session-do";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/interview-realtime/ws") {
      return handleInterviewRealtimeWs(request, env);
    }

    // Handle the recording upload directly so the Nextcloud upload can run in
    // the background via ctx.waitUntil (survives the client moving on / closing
    // the tab) instead of blocking the interview-end flow.
    if (
      request.method === "POST" &&
      url.pathname.startsWith("/api/interview-token/") &&
      url.pathname.endsWith("/upload-audio")
    ) {
      const token = decodeURIComponent(url.pathname.split("/")[3] ?? "");
      return handleRecordingUpload(request, token, {
        waitUntil: (promise) => ctx.waitUntil(promise),
      });
    }

    return handler.fetch(request);
  },

  queue: handleAsyncJobQueue,
};
