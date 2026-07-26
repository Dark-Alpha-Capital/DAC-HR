import { and, eq } from "@workspace/db";
import { db } from "@workspace/db/db";
import { application, candidatePosition } from "@workspace/db/schema";

/**
 * Ensures an application (+ candidatePosition) exists for candidate×position.
 * Idempotent: returns linked=false when the pair already exists.
 */
export async function ensurePositionLink(args: {
  candidateId: string;
  positionId: string;
}): Promise<{ linked: boolean }> {
  const existing = await db
    .select({ id: application.id })
    .from(application)
    .where(
      and(
        eq(application.candidateId, args.candidateId),
        eq(application.positionId, args.positionId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return { linked: false };
  }

  await db.insert(application).values({
    candidateId: args.candidateId,
    positionId: args.positionId,
    status: "ai_screening",
  });

  const existingLink = await db
    .select({ id: candidatePosition.id })
    .from(candidatePosition)
    .where(
      and(
        eq(candidatePosition.candidateId, args.candidateId),
        eq(candidatePosition.positionId, args.positionId),
      ),
    )
    .limit(1);

  if (!existingLink[0]) {
    await db.insert(candidatePosition).values({
      candidateId: args.candidateId,
      positionId: args.positionId,
    });
  }

  return { linked: true };
}
