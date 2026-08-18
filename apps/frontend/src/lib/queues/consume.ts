import { NonRetryableError } from "cloudflare:workflows";
import {
  OUTBOUND_EMAIL_QUEUE_NAME,
  type OutboxPointerMessage,
} from "./queue-config";
import {
  assertOutboundEmailPayload,
  fetchOutboxQueuePayload,
  markOutboxSettled,
} from "../workflows/workflow-outbox";
import { runOutboundEmailSend } from "./outbound-email-send";
import { parseEmailJobData } from "./parse-email-job-data";

async function processEmailOutbox(outboxId: string): Promise<void> {
  const payload = await fetchOutboxQueuePayload(outboxId);
  assertOutboundEmailPayload(payload);
  await runOutboundEmailSend(parseEmailJobData(payload.data), {
    idempotencyKey: outboxId,
  });
}

/** Exponential backoff in seconds: 30s, 60s, 120s, … capped at 900s (15 min). */
function retryDelayMs(attempt: number): number {
  const delaySeconds = Math.min(30 * 2 ** (attempt - 1), 900);
  return delaySeconds * 1000;
}

/**
 * Cloudflare Queues consumer: one Worker can serve multiple queues; route by `batch.queue`.
 * Per-message ack/retry so one failure does not force the whole batch to retry.
 */
export async function handleAsyncJobQueue(
  batch: MessageBatch<OutboxPointerMessage>,
  _env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  if (batch.queue !== OUTBOUND_EMAIL_QUEUE_NAME) {
    console.warn(`[queues] Ignoring unknown queue: ${batch.queue}`);
    return;
  }

  for (const message of batch.messages) {
    const { outboxId } = message.body;
    if (!outboxId) {
      console.error("[queues] Missing outboxId in message body");
      message.ack();
      continue;
    }

    try {
      await processEmailOutbox(outboxId);
      await markOutboxSettled(outboxId, "sent");
      message.ack();
    } catch (err) {
      if (err instanceof NonRetryableError) {
        console.error(
          `[queues] Non-retryable failure queue=${batch.queue} outboxId=${outboxId}:`,
          err.message,
        );
        await markOutboxSettled(outboxId, "failed", err.message);
        message.ack();
        continue;
      }
      const attempt = message.attempts ?? 1;
      console.error(
        `[queues] Retry queue=${batch.queue} outboxId=${outboxId} attempt=${attempt}:`,
        err,
      );
      message.retry({ delaySeconds: retryDelayMs(attempt) / 1000 });
    }
  }
}
