import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { sideEffectOutbox } from "@workspace/db/schema";
import type { Database } from "@workspace/db/db";
import type { JsonValue } from "#/lib/types/json";
import { parseQueuePayload } from "./parse-queue-payload";

const MAX_DISPATCH_ATTEMPTS = 5;

/** Injectable dispatch targets — the test seam for the claim→dispatch cycle. */
export type DispatchTargets = {
  email: (outboxId: string) => Promise<void>;
};

/**
 * Claim pending/failed outbox rows and dispatch them via the injected targets.
 * Pure logic — no Cloudflare bindings — so the claim→dispatch→ack cycle is
 * unit-testable with a stubbed db + fake targets.
 */
export async function dispatchOutboxCandidates(
  db: Database,
  targets: DispatchTargets,
  batchSize = 25,
): Promise<void> {
  const candidates = await db
    .select({
      id: sideEffectOutbox.id,
      payload: sideEffectOutbox.payload,
      status: sideEffectOutbox.status,
    })
    .from(sideEffectOutbox)
    .where(
      and(
        inArray(sideEffectOutbox.status, ["pending", "failed"]),
        isNull(sideEffectOutbox.dispatchedAt),
        lt(sideEffectOutbox.attempts, MAX_DISPATCH_ATTEMPTS),
      ),
    )
    .orderBy(asc(sideEffectOutbox.createdAt))
    .limit(batchSize);

  console.log(`[Outbox] dispatching ${candidates.length} candidate(s)`);

  for (const candidate of candidates) {
    const [claimed] = await db
      .update(sideEffectOutbox)
      .set({
        status: "processing",
        attempts: sql`${sideEffectOutbox.attempts} + 1`,
        lastError: null,
      })
      .where(
        and(
          eq(sideEffectOutbox.id, candidate.id),
          inArray(sideEffectOutbox.status, ["pending", "failed"]),
        ),
      )
      .returning({ id: sideEffectOutbox.id, payload: sideEffectOutbox.payload });

    if (!claimed) continue;

    // SAFETY: Drizzle json payload is JsonValue-compatible once read from the outbox row.
    const payload = parseQueuePayload(
      structuredClone(claimed.payload) as JsonValue,
    );

    try {
      if (payload.queue === "email") {
        await targets.email(claimed.id);
      } else {
        throw new Error(`Unsupported outbox queue type: ${payload.queue}`);
      }

      await db
        .update(sideEffectOutbox)
        .set({
          status: "dispatched",
          dispatchedAt: new Date(),
          lastError: null,
        })
        .where(eq(sideEffectOutbox.id, claimed.id));

      console.log(
        `[Outbox] dispatched outboxId=${claimed.id} queue=${payload.queue} jobId=${payload.jobId}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : "Unknown dispatch failure";
      console.error(
        `[Outbox] dispatch failed outboxId=${claimed.id} queue=${payload.queue} jobId=${payload.jobId}: ${message}`,
        error,
      );
      await db
        .update(sideEffectOutbox)
        .set({
          status: "failed",
          lastError: message,
        })
        .where(eq(sideEffectOutbox.id, claimed.id));
    }
  }
}

/**
 * TTL sweep for rows the queue consumer never settled. A row stays `dispatched`
 * while Cloudflare Queues retries the message (up to `max_retries`); if the
 * queue exhausts retries and drops the message, the row would otherwise remain
 * `dispatched` forever. Flipping it to `failed` records the terminal state
 * (the `dispatchedAt IS NULL` claim guard keeps it from being re-claimed).
 */
export async function sweepStaleDispatchedOutbox(
  db: Database,
  olderThanMs: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const result = await db
    .update(sideEffectOutbox)
    .set({
      status: "failed",
      lastError: "queue retry budget exhausted: consumer never settled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sideEffectOutbox.status, "dispatched"),
        lt(sideEffectOutbox.dispatchedAt, cutoff),
      ),
    )
    .returning({ id: sideEffectOutbox.id });

  if (result.length > 0) {
    console.log(
      `[Outbox] swept ${result.length} stale dispatched row(s) to failed`,
    );
  }
  return result.length;
}
