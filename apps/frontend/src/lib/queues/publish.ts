import type { OutboxPointerMessage } from "./queue-config";

/** Enqueue an outbox row for async processing (email queue). */
export async function publishOutboxPointer(
  queue: Queue<OutboxPointerMessage>,
  outboxId: string,
): Promise<void> {
  await queue.send({ outboxId });
}
