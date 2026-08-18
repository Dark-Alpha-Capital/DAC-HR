import { randomUUID } from "crypto";
import type { Database } from "@workspace/db/db";
import { sideEffectOutbox } from "@workspace/db/schema";
import type { JsonValue } from "#/lib/types/json";
import type { QueuePayload } from "./side-effect-payload";
import { dispatchPendingOutbox, type DispatchTargets } from "./outbox";

export type { DispatchTargets } from "./outbox";

export type EnqueueRow = {
  topic?: string;
  dedupeKey: string;
  payload: QueuePayload;
};

/**
 * Insert outbox rows and dispatch them. The single seam for every queued
 * side-effect (email).
 */
export async function enqueueSideEffect(
  db: Database,
  rows: EnqueueRow[],
  targets?: DispatchTargets,
): Promise<void> {
  if (rows.length === 0) return;

  // dedupeKey is UNIQUE — a re-emit (e.g. a second reconcile pass) must not
  // throw a constraint error; the existing row is the intended dedupe.
  await db
    .insert(sideEffectOutbox)
    .values(
      rows.map((row) => ({
        id: randomUUID(),
        topic: row.topic ?? "queue",
        dedupeKey: row.dedupeKey,
        payload: row.payload,
      })),
    )
    .onConflictDoNothing();

  await dispatchPendingOutbox(db, 25, targets);
}

/** Enqueue one or more email jobs. */
export async function enqueueEmail(
  db: Database,
  rows: Array<{
    jobName: string;
    jobId: string;
    dedupeKey: string;
    data: JsonValue;
  }>,
  targets?: DispatchTargets,
): Promise<void> {
  return enqueueSideEffect(
    db,
    rows.map((row) => ({
      dedupeKey: row.dedupeKey,
      payload: {
        queue: "email" as const,
        jobName: row.jobName,
        jobId: row.jobId,
        data: row.data,
      },
    })),
    targets,
  );
}
