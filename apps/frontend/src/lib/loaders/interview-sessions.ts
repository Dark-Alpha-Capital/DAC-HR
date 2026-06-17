import { createServerFn } from "@tanstack/react-start";
import {
  getAllSessions,
  getEvaluationBySessionId,
  getResponsesBySessionId,
  getSessionById,
} from "@workspace/db/repositories/interview-session-repository";
import { getAllApplications, getPositions } from "@workspace/db/queries";

export const loadInterviewSessionsIndex = createServerFn({ method: "GET" }).handler(
  async () => {
    const [sessions, applications, { positions }] = await Promise.all([
      getAllSessions(),
      getAllApplications(),
      getPositions(),
    ]);
    return { sessions, applications, positions };
  },
);

export const loadInterviewSessionsNew = createServerFn({ method: "GET" }).handler(
  async () => {
    const applications = await getAllApplications();
    return { applications };
  },
);

export const loadInterviewSessionDetail = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const row = await getSessionById(data.id);
    if (!row) {
      throw new Error("Session not found");
    }
    const [responses, evaluation] = await Promise.all([
      getResponsesBySessionId(data.id),
      getEvaluationBySessionId(data.id),
    ]);
    return {
      session: row.session,
      candidate: row.candidate,
      position: row.position,
      round: row.round,
      responses,
      evaluation,
    };
  });
