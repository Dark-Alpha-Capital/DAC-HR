import { describe, expect, test } from "bun:test";
import {
  dispatchOutboxCandidates,
  sweepStaleDispatchedOutbox,
  type DispatchTargets,
} from "./outbox-core";
import type { QueuePayload } from "./side-effect-payload";
import type { JsonValue } from "#/lib/types/json";

type FakeOutboxRow = {
  payload: JsonValue;
  status: string;
  attempts: number;
  lastError?: JsonValue;
  dispatchedAt?: JsonValue;
};

/** Minimal in-memory outbox table backed by rows. */
function makeFakeOutbox() {
  const rows = new Map<string, FakeOutboxRow>();
  let lastClaimedId: string | null = null;

  const dbObject = {
    select() {
      return {
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: (n: number) => {
                  const candidates = [...rows.entries()]
                    .filter(([, r]) => r.status === "pending" || r.status === "failed")
                    .filter(([, r]) => r.dispatchedAt === undefined)
                    .filter(([, r]) => r.attempts < 5)
                  .slice(0, n)
                  .map(([id, r]) => ({ id, payload: r.payload, status: r.status }));
                return Promise.resolve(candidates);
              },
            }),
          }),
        }),
      };
    },
    update() {
      return {
        set: (values: {
          status?: string;
          attempts?: unknown;
          lastError?: JsonValue;
          dispatchedAt?: JsonValue;
        }) => ({
          where: () => {
            const apply = () => {
                // Claim phase: pick the first pending/failed row not yet dispatched.
                if (values.status === "processing") {
                  for (const [id, r] of rows) {
                    if (
                      (r.status === "pending" || r.status === "failed") &&
                      r.dispatchedAt === undefined
                    ) {
                    r.status = "processing";
                    if (values.attempts !== undefined) r.attempts += 1;
                    lastClaimedId = id;
                    return [{ id, payload: r.payload }];
                  }
                }
                return [];
              }
              // Settlement phase: apply to the claimed row.
              if (lastClaimedId && rows.has(lastClaimedId)) {
                const r = rows.get(lastClaimedId)!;
                if (values.status) r.status = values.status;
                if ("lastError" in values) r.lastError = values.lastError ?? null;
                if (values.dispatchedAt) r.dispatchedAt = values.dispatchedAt;
                lastClaimedId = null;
                return [];
              }
              return [];
            };
            const thenable = {
              then: (resolve: (value: ReturnType<typeof apply>) => void) => {
                resolve(apply());
              },
            };
            return Object.assign(thenable, {
              returning: async () => apply(),
            });
          },
        }),
      };
    },
  };

  // SAFETY: test double implements only the Drizzle methods dispatchOutboxCandidates calls.
  const db = dbObject as never;

  return {
    rows,
    insert(id: string, payload: QueuePayload) {
      rows.set(id, { payload, status: "pending", attempts: 0 });
    },
    db,
  };
}

const emailPayload: QueuePayload = {
  queue: "email",
  jobName: "knowledge-request-admin",
  jobId: "job-1",
  data: { to: "a@b.com" },
};

describe("outbox dispatch loop", () => {
  test("claims pending rows and dispatches each via the email target", async () => {
    const outbox = makeFakeOutbox();
    outbox.insert("row-1", emailPayload);
    outbox.insert("row-2", { ...emailPayload, jobId: "job-2" });

    const dispatched: string[] = [];
    const targets: DispatchTargets = {
      email: async (id) => {
        dispatched.push(`email:${id}`);
      },
    };

    await dispatchOutboxCandidates(outbox.db, targets);

    expect(dispatched).toEqual(["email:row-1", "email:row-2"]);
    expect(outbox.rows.get("row-1")!.status).toBe("dispatched");
    expect(outbox.rows.get("row-2")!.status).toBe("dispatched");
  });

  test("failed dispatch marks row failed and keeps attempts incremented", async () => {
    const outbox = makeFakeOutbox();
    outbox.insert("row-3", emailPayload);

    const targets: DispatchTargets = {
      email: async () => {
        throw new Error("boom");
      },
    };

    await dispatchOutboxCandidates(outbox.db, targets);
    expect(outbox.rows.get("row-3")!.status).toBe("failed");
    expect(outbox.rows.get("row-3")!.attempts).toBe(1);
  });

  test("skips rows already at the dispatch attempt ceiling", async () => {
    const outbox = makeFakeOutbox();
    outbox.rows.set("row-4", { payload: emailPayload, status: "failed", attempts: 5 });

    let called = 0;
    const targets: DispatchTargets = {
      email: async () => {
        called += 1;
      },
    };

    await dispatchOutboxCandidates(outbox.db, targets);
    expect(called).toBe(0);
    expect(outbox.rows.get("row-4")!.status).toBe("failed");
  });

  test("consumer-settled failed row (dispatchedAt set) is never re-claimed", async () => {
    const outbox = makeFakeOutbox();
    // Consumer marked the row failed AFTER it was dispatched to the queue.
    outbox.rows.set("row-5", {
      payload: emailPayload,
      status: "failed",
      attempts: 1,
      dispatchedAt: Date.now(),
    });

    let called = 0;
    const targets: DispatchTargets = {
      email: async () => {
        called += 1;
      },
    };

    await dispatchOutboxCandidates(outbox.db, targets);
    expect(called).toBe(0);
    expect(outbox.rows.get("row-5")!.status).toBe("failed");
  });

  test("dispatch-phase failed row (dispatchedAt unset) is re-claimed until ceiling", async () => {
    const outbox = makeFakeOutbox();
    outbox.rows.set("row-6", { payload: emailPayload, status: "failed", attempts: 3 });

    let called = 0;
    const targets: DispatchTargets = {
      email: async () => {
        called += 1;
        throw new Error("still failing");
      },
    };

    await dispatchOutboxCandidates(outbox.db, targets);
    expect(called).toBe(1);
    expect(outbox.rows.get("row-6")!.attempts).toBe(4);
    expect(outbox.rows.get("row-6")!.status).toBe("failed");
    expect(outbox.rows.get("row-6")!.dispatchedAt).toBeUndefined();
  });

  test("sweep flips stale dispatched rows to failed with a note", async () => {
    const rows = new Map<string, { status: string; lastError?: unknown; dispatchedAt: unknown }>([
      ["stale-1", { status: "dispatched", dispatchedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }],
      ["fresh-1", { status: "dispatched", dispatchedAt: new Date() }],
    ]);

    // SAFETY: the fake below satisfies sweepStaleDispatchedOutbox's Db contract shape.
    const db = {
      update: () => ({
        set: (values: { status?: string; lastError?: string; updatedAt?: Date }) => ({
          where: () => ({
            returning: async () => {
              const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const matched: { id: string }[] = [];
              for (const [id, r] of rows) {
                if (r.status !== "dispatched") continue;
                // SAFETY: dispatched rows always set dispatchedAt as a Date in this fixture.
                const at = r.dispatchedAt as Date;
                if (at < cutoff) {
                  r.status = values.status ?? r.status;
                  if (values.lastError !== undefined) r.lastError = values.lastError;
                  matched.push({ id });
                }
              }
              return matched;
            },
          }),
        }),
      }),
    } as never;

    const swept = await sweepStaleDispatchedOutbox(db, 24 * 60 * 60 * 1000);
    expect(swept).toBe(1);
    expect(rows.get("stale-1")!.status).toBe("failed");
    expect(rows.get("stale-1")!.lastError).toBeTruthy();
    expect(rows.get("fresh-1")!.status).toBe("dispatched");
  });
});
