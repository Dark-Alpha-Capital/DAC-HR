/// <reference types="@cloudflare/workers-types" />

import { resolveSessionFromToken } from "@workspace/db/repositories/interview-bundle-repository";

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

  const resolved = await resolveSessionFromToken(token);
  if (!resolved.ok) {
    return new Response(resolved.error, { status: resolved.status });
  }

  const sessionId = resolved.session.id;
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
