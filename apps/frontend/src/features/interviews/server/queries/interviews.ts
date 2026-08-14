import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { getInterviewAiAnalysesByBundleId } from "@workspace/db/repositories/interview-repository";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getInterviewById, getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import {
  getSessionByInterviewId,
  getResponsesBySessionId,
  getEvaluationBySessionId,
} from "@workspace/db/repositories/interview-session-repository";
import {
  getBundleById,
  getBundleRounds,
} from "@workspace/db/repositories/interview-bundle-repository";

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

export type InterviewBundleDetailData = {
  bundle: NonNullable<Awaited<ReturnType<typeof getBundleById>>>;
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  rounds: Awaited<ReturnType<typeof getBundleRounds>>;
  roundDetails: Array<{
    round: Awaited<ReturnType<typeof getBundleRounds>>[number];
    responses: Awaited<ReturnType<typeof getResponsesBySessionId>>;
    evaluation: Awaited<ReturnType<typeof getEvaluationBySessionId>> | null;
  }>;
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

export const loadInterviewBundleById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: bundleId }) => {
    const bundle = await getBundleById(bundleId);

    if (!bundle) {
      return null;
    }

    const application = await getApplicationWithInterviews(bundle.applicationId);
    const candidate = application
      ? await getCandidateById(application.candidateId)
      : null;

    const rounds = await getBundleRounds(bundleId);

    const roundDetails = await Promise.all(
      rounds.map(async (round) => {
        const [responses, evaluation] = await Promise.all([
          getResponsesBySessionId(round.session.id).catch(() => []),
          getEvaluationBySessionId(round.session.id).catch(() => null),
        ]);
        return { round, responses, evaluation };
      }),
    );

    return {
      bundle,
      application,
      candidate,
      rounds,
      roundDetails,
    } satisfies InterviewBundleDetailData;
  });

export const loadBundleAiAnalyses = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: bundleId }) => {
    const analyses = await getInterviewAiAnalysesByBundleId(bundleId);
    return { analyses };
  });
