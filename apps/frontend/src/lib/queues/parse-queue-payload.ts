import { z } from "zod";
import type { JsonValue } from "#/lib/types/json";
import type { QueuePayload } from "./side-effect-payload";

const queuePayloadSchema = z.object({
  queue: z.enum(["email"]),
  jobName: z.string(),
  jobId: z.string(),
  data: z.custom<JsonValue>(() => true),
}) satisfies z.ZodType<QueuePayload>;

/** Parse outbox JSON payload at the queue I/O boundary. */
export function parseQueuePayload(value: JsonValue): QueuePayload {
  return queuePayloadSchema.parse(value);
}
