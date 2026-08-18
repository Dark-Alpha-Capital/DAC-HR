import type { Database } from "@workspace/db/db";
import { env } from "cloudflare:workers";
import { publishOutboxPointer } from "./publish";
import {
  dispatchOutboxCandidates,
  sweepStaleDispatchedOutbox,
  type DispatchTargets,
} from "./outbox-core";

export type { DispatchTargets } from "./outbox-core";

/**
 * Production dispatch wiring — maps an outbox row to its Cloudflare target.
 * Injectable so tests can stub the claim→dispatch→ack cycle.
 */
export function defaultDispatchTargets(env: Env): DispatchTargets {
  return {
    async email(outboxId: string) {
      console.log(`[Outbox] publishing email queue outboxId=${outboxId}`);
      await publishOutboxPointer(env.OUTBOUND_EMAIL_QUEUE, outboxId);
    },
  };
}

/**
 * Claim pending/failed outbox rows and dispatch them. `targets` defaults to the
 * production Cloudflare wiring; pass your own to test.
 */
export async function dispatchPendingOutbox(
  db: Database,
  batchSize = 25,
  targets?: DispatchTargets,
): Promise<void> {
  // Recover rows the queue consumer never settled (queue retries exhausted).
  // 24h is well beyond the queue's max backoff window (~15 min cap).
  await sweepStaleDispatchedOutbox(db, 24 * 60 * 60 * 1000);
  return dispatchOutboxCandidates(db, targets ?? defaultDispatchTargets(env), batchSize);
}
