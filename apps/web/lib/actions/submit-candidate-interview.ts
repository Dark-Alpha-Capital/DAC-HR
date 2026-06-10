import { db } from "@workspace/db";
import { interview, interviewFeedback } from "@workspace/db/schema";
import { eq } from "@workspace/db";

export const startCandidateInterview = async (
  token: string,
): Promise<
  | { success: true; candidateStartedAt: Date }
  | { error: string }
> => {
  try {
    const [row] = await db
      .select({
        id: interview.id,
        linkExpiresAt: interview.linkExpiresAt,
        candidateStartedAt: interview.candidateStartedAt,
        candidateSubmittedAt: interview.candidateSubmittedAt,
      })
      .from(interview)
      .where(eq(interview.linkToken, token))
      .limit(1);

    if (!row) return { error: "invalid_token" };
    if (row.linkExpiresAt && row.linkExpiresAt < new Date())
      return { error: "link_expired" };
    if (row.candidateSubmittedAt) return { error: "already_submitted" };

    if (row.candidateStartedAt) {
      return { success: true, candidateStartedAt: row.candidateStartedAt };
    }

    const startedAt = new Date();
    await db
      .update(interview)
      .set({ candidateStartedAt: startedAt })
      .where(eq(interview.id, row.id));

    return { success: true, candidateStartedAt: startedAt };
  } catch (error) {
    console.error("Error starting candidate interview", error);
    return { error: "Failed to start interview" };
  }
};

export interface CandidateResponse {
  questionId: string;
  answer: string;
}

export const submitCandidateInterview = async (
  token: string,
  responses: CandidateResponse[],
): Promise<{ success: true } | { error: string }> => {
  try {
    const [row] = await db
      .select({
        id: interview.id,
        linkExpiresAt: interview.linkExpiresAt,
        candidateStartedAt: interview.candidateStartedAt,
        candidateSubmittedAt: interview.candidateSubmittedAt,
      })
      .from(interview)
      .where(eq(interview.linkToken, token))
      .limit(1);

    if (!row) return { error: "invalid_token" };
    if (row.candidateSubmittedAt) return { error: "already_submitted" };
    if (!row.candidateStartedAt) return { error: "not_started" };
    // Expiry only blocks submissions if the candidate never started

    await db
      .update(interview)
      .set({ candidateSubmittedAt: new Date() })
      .where(eq(interview.id, row.id));

    for (const { questionId, answer } of responses) {
      if (!answer.trim()) continue;
      await db
        .insert(interviewFeedback)
        .values({ interviewId: row.id, questionId, notes: answer })
        .onConflictDoUpdate({
          target: [interviewFeedback.interviewId, interviewFeedback.questionId],
          set: { notes: answer },
        });
    }

    return { success: true };
  } catch (error) {
    console.error("Error submitting candidate interview", error);
    return { error: "Failed to submit interview" };
  }
};
