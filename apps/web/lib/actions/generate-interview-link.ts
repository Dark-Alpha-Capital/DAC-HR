import { defineAction } from "./create-action";
import { db } from "@workspace/db/db";
import { interview, positionRoundTemplates } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { getSession } from "@/lib/middleware/auth-guard";
import { createSession } from "@workspace/db/repositories/interview-session-repository";

export interface GenerateInterviewLinkInput {
  interviewId: string;
  expiresInHours: 24 | 48 | 72;
}

export const generateInterviewLink = defineAction(async (
  data: GenerateInterviewLinkInput,
): Promise<
  | { success: true; token: string; linkExpiresAt: Date }
  | { error: string }
> => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { interviewId, expiresInHours } = data;

  try {
    const [row] = await db
      .select({
        applicationId: interview.applicationId,
        roundId: positionRoundTemplates.roundTemplateId,
      })
      .from(interview)
      .innerJoin(
        positionRoundTemplates,
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id),
      )
      .where(eq(interview.id, interviewId))
      .limit(1);

    if (!row) {
      return { error: "Interview not found" };
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const interviewSession = await createSession({
      applicationId: row.applicationId,
      roundId: row.roundId,
      expiresAt,
    });

    return { success: true, token: interviewSession.token, linkExpiresAt: expiresAt };
  } catch (error) {
    console.error("Error generating interview link", error);
    return { error: "Failed to generate interview link" };
  }
});
