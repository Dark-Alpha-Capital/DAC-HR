/** Cloudflare Queue names — must match wrangler.jsonc `queues.*.queue` values. */
export const OUTBOUND_EMAIL_QUEUE_NAME = "hr-outbound-email";

/** Message body: full job payload stays in D1 (`sideEffectOutbox`); the queue only carries the outbox row id (< 128 KB limit). */
export type OutboxPointerMessage = {
  outboxId: string;
};
