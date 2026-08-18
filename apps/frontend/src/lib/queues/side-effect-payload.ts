import type { JsonValue } from "#/lib/types/json";

export type QueuePayload = {
  queue: "email";
  jobName: string;
  jobId: string;
  data: JsonValue;
};
