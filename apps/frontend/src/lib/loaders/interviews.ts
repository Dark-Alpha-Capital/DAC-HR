import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import {
  getApplicationWithInterviews,
  getInterviewById,
} from "@workspace/db/repositories/interview-repository";
import {
  getSessionByInterviewId,
  getResponsesBySessionId,
  getEvaluationBySessionId,
} from "@workspace/db/repositories/interview-session-repository";

export type InterviewDetailData = {
  interview: Awaited<ReturnType<typeof getInterviewById>>;
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  session: Awaited<ReturnType<typeof getSessionByInterviewId>> | null;
  responses: Awaited<ReturnType<typeof getResponsesBySessionId>>;
  evaluation:
    | Awaited<ReturnType<typeof getEvaluationBySessionId>>
    | null;
};

export type InterviewResponse = InterviewDetailData["responses"][number];

export type InterviewQuestion = NonNullable<
  InterviewDetailData["interview"]
>["questions"][number];

const emptyInterviewDetail: InterviewDetailData = {
  interview: null,
  application: null,
  candidate: null,
  session: null,
  responses: [],
  evaluation: null,
};

export const loadInterviewById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => {
    const interview = await getInterviewById(id);

    if (!interview) {
      return emptyInterviewDetail;
    }

    const application = await getApplicationWithInterviews(
      interview.applicationId,
    );
    const candidate = application
      ? await getCandidateById(application.candidateId)
      : null;

    let session: InterviewDetailData["session"] = null;
    let responses: InterviewDetailData["responses"] = [];
    let evaluation: InterviewDetailData["evaluation"] = null;

    if (interview.mode === "ai_session") {
      session = await getSessionByInterviewId(interview.id).catch(() => null);
      if (session) {
        responses = await getResponsesBySessionId(session.session.id).catch(
          () => [],
        );
        evaluation = await getEvaluationBySessionId(session.session.id).catch(
          () => null,
        );
      }
    }

    return {
      interview,
      application,
      candidate,
      session,
      responses,
      evaluation,
    } as InterviewDetailData;
  });
