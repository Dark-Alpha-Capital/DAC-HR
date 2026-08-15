import type { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import type { getCandidateById, getCandidateAiScreenings, getUsers } from "@workspace/db/repositories/candidate-repository";
import type { getSessionsByApplicationId } from "@workspace/db/repositories/interview-session-repository";
import type { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import type { CandidateAiScreeningData } from "./schemas";

/**
 * Full shape returned by getApplicationWithInterviews — the single canonical
 * application detail type. Components that need a narrower view pick from it.
 */
export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof getApplicationWithInterviews>>
>;

export type ApplicationProgress = Pick<
  ApplicationDetail,
  "id" | "candidateId" | "positionId" | "rounds"
>;

export type ApplicationRounds = ApplicationDetail["rounds"];

export type ApplicationDetailData = {
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  sessions: Awaited<ReturnType<typeof getSessionsByApplicationId>>;
  aiScreenings: Array<
    Omit<
      Awaited<ReturnType<typeof getCandidateAiScreenings>>[number],
      "structuredData"
    > & { structuredData: CandidateAiScreeningData | null }
  >;
  documents: Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
  users: Awaited<ReturnType<typeof getUsers>>;
};
