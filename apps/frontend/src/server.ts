import handler from "@tanstack/react-start/server-entry";
import { handleInterviewRealtimeWs } from "./lib/interview-realtime/ws-handler";

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
    return handler.fetch(request, env, ctx);
  },
};
