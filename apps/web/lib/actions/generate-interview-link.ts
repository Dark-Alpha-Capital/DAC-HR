import { db } from "@workspace/db";
import { interview } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { getSession } from "@/lib/middleware/auth-guard";

export interface GenerateInterviewLinkInput {
  interviewId: string;
  expiresInHours: 24 | 48 | 72;
}

export const generateInterviewLink = async (
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
    const [existing] = await db
      .select({ id: interview.id })
      .from(interview)
      .where(eq(interview.id, interviewId))
      .limit(1);

    if (!existing) {
      return { error: "Interview not found" };
    }

    const token = crypto.randomUUID();
    const linkExpiresAt = new Date(
      Date.now() + expiresInHours * 60 * 60 * 1000,
    );

    await db
      .update(interview)
      .set({ linkToken: token, linkExpiresAt })
      .where(eq(interview.id, interviewId));

    return { success: true, token, linkExpiresAt };
  } catch (error) {
    console.error("Error generating interview link", error);
    return { error: "Failed to generate interview link" };
  }
};
