import { db } from "./db";
import { roundTemplate } from "./schema";
import {
  DEFAULT_SCREENING_ROUND,
  DEFAULT_TECHNICAL_ROUND,
} from "./default-rounds";

export async function createDefaultRoundsForPosition(positionId: string) {
  return db
    .insert(roundTemplate)
    .values([
      { positionId, ...DEFAULT_SCREENING_ROUND },
      { positionId, ...DEFAULT_TECHNICAL_ROUND },
    ])
    .returning();
}
