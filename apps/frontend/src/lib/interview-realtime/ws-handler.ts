/// <reference types="@cloudflare/workers-types" />

import { assertInterviewTokenValid } from "@workspace/db/repositories/interview-session-repository";

export interface InterviewRealtimeEnv {
  INTERVIEW_SESSION_DO: DurableObjectNamespace;
}

export async function handleInterviewRealtimeWs(
  request: Request,
  env: InterviewRealtimeEnv,
): Promise<Response> {
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Token is required", { status: 400 });
  }

  const validation = await assertInterviewTokenValid(token);
  if (!validation.ok) {
    return new Response(validation.error, { status: validation.status });
  }

  const sessionId = validation.row.session.id;
  const id = env.INTERVIEW_SESSION_DO.idFromName(sessionId);
  const stub = env.INTERVIEW_SESSION_DO.get(id);

  const doUrl = new URL(request.url);
  doUrl.searchParams.set("sessionId", sessionId);
  doUrl.searchParams.set("token", token);

  return stub.fetch(
    new Request(doUrl.toString(), {
      headers: request.headers,
    }),
  );
}
