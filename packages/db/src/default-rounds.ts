import { db } from "./db";
import { roundTemplate } from "./schema";

export const DEFAULT_SCREENING_ROUND = {
  name: "Screening/Recruiter Round",
  description: "Initial screening and recruiter interview round",
} as const;

export const DEFAULT_TECHNICAL_ROUND = {
  name: "Technical Round",
  description: "Technical assessment round",
} as const;

export async function createDefaultRoundsForPosition(positionId: string) {
  return db
    .insert(roundTemplate)
    .values([
      { positionId, ...DEFAULT_SCREENING_ROUND },
      { positionId, ...DEFAULT_TECHNICAL_ROUND },
    ])
    .returning();
}
