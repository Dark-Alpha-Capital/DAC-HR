import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import {
  getApplicationWithInterviews,
  getInterviewById,
} from "@workspace/db/repositories/interview-repository";
import {
  getSessionById,
  getResponsesBySessionId,
  getEvaluationBySessionId,
  getSessionsByApplicationId,
} from "@workspace/db/repositories/interview-session-repository";

export const loadInterviewById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
    const interview = await getInterviewById(id);

    if (!interview) {
      return {
        interview: null,
        application: null,
        candidate: null,
        session: null,
        responses: null,
        evaluation: null,
      };
    }

    const application = await getApplicationWithInterviews(
      interview.applicationId,
    );
    const candidate = application
      ? await getCandidateById(application.candidateId)
      : null;

    let session = null;
    let responses = null;
    let evaluation = null;

    if ((interview as any).mode === "ai_session") {
      const sessions = await getSessionsByApplicationId(
        interview.applicationId,
      ).catch(() => []);

      const linkedSession = sessions.find(
        (s: any) => s.roundId === interview.roundTemplate.id,
      );

      if (linkedSession) {
        session = await getSessionById(linkedSession.id).catch(() => null);
        if (session) {
          responses = await getResponsesBySessionId(
            session.session.id,
          ).catch(() => []);
          evaluation = await getEvaluationBySessionId(
            session.session.id,
          ).catch(() => null);
        }
      }
    }

    return {
      interview,
      application,
      candidate,
      session,
      responses,
      evaluation,
    };
  });
