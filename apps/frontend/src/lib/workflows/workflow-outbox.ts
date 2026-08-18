import { NonRetryableError } from "cloudflare:workflows";
import { db } from "@workspace/db/db";
import { sideEffectOutbox } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { JsonValue } from "#/lib/types/json";
import { parseQueuePayload } from "../queues/parse-queue-payload";
import type { QueuePayload } from "../queues/side-effect-payload";

export async function fetchOutboxQueuePayload(
  outboxId: string,
): Promise<QueuePayload> {
  const rows = await db
    .select({ payload: sideEffectOutbox.payload })
    .from(sideEffectOutbox)
    .where(eq(sideEffectOutbox.id, outboxId))
    .limit(1);
  const row = rows[0];
  if (!row?.payload) {
    throw new NonRetryableError(`Outbox row not found: ${outboxId}`);
  }
  // SAFETY: Drizzle json payload is JsonValue-compatible once read from the outbox row.
  return parseQueuePayload(structuredClone(row.payload) as JsonValue);
}

/**
 * Record the terminal outcome of a queued side-effect back on the outbox row.
 * Called by the queue consumer after a send succeeds (`sent`) or permanently
 * fails (`failed`) so rows reflect reality instead of staying `dispatched`.
 */
export async function markOutboxSettled(
  outboxId: string,
  outcome: "sent" | "failed",
  error?: string,
): Promise<void> {
  await db
    .update(sideEffectOutbox)
    .set({
      status: outcome,
      lastError: outcome === "failed" ? (error ?? "unknown failure") : null,
      updatedAt: new Date(),
    })
    .where(eq(sideEffectOutbox.id, outboxId));
}

export function assertOutboundEmailPayload(p: QueuePayload): void {
  if (p.queue !== "email") {
    throw new NonRetryableError(
      `email queue consumer: expected queue=email, got ${p.queue}`,
    );
  }
}
