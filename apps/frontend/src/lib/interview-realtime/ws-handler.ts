/// <reference types="@cloudflare/workers-types" />

import { resolveSessionFromToken } from "@workspace/db/repositories/interview-bundle-repository";
import {
  interviewServerLog,
  truncateId,
} from "@workspace/interview-realtime/debug-log";

export interface InterviewRealtimeEnv {
  INTERVIEW_SESSION_DO: DurableObjectNamespace;
}

const COMPONENT = "ws-handler";

export async function handleInterviewRealtimeWs(
  request: Request,
  env: InterviewRealtimeEnv,
): Promise<Response> {
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    interviewServerLog.warn("ws", COMPONENT, "upgrade_required");
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const isPractice = url.searchParams.get("practice") === "1";

  if (!token) {
    interviewServerLog.warn("ws", COMPONENT, "token_missing");
    return new Response("Token is required", { status: 400 });
  }

  interviewServerLog.info("ws", COMPONENT, "ws_upgrade_request", {
    token: truncateId(token),
    isPractice,
  });

  const resolved = await resolveSessionFromToken(token);
  if (!resolved.ok) {
    interviewServerLog.warn("ws", COMPONENT, "token_resolve_failed", {
      token: truncateId(token),
      status: resolved.status,
      error: resolved.error,
    });
    return new Response(resolved.error, { status: resolved.status });
  }

  const sessionId = resolved.session.id;
  const id = env.INTERVIEW_SESSION_DO.idFromName(sessionId);
  const stub = env.INTERVIEW_SESSION_DO.get(id);

  const doUrl = new URL(request.url);
  doUrl.searchParams.set("sessionId", sessionId);
  doUrl.searchParams.set("token", token);

  interviewServerLog.success("ws", COMPONENT, "ws_forward_to_do", {
    token: truncateId(token),
    sessionId: truncateId(sessionId),
    isPractice,
  });

  return stub.fetch(
    new Request(doUrl.toString(), {
      headers: request.headers,
    }),
  );
}
