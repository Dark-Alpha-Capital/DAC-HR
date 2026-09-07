import { describe, expect, test } from "bun:test";

import {
  applicationActivePipelineStatuses,
  buildNormalizedStatusCase,
  legacyApplicationStatusMap,
  normalizeApplicationStatus,
  pickLatestApplication,
} from "./application-status";
import { applicationStatuses } from "./enums";

describe("application status vocabulary", () => {
  test("active pipeline statuses are all statuses except rejected", () => {
    expect(applicationActivePipelineStatuses).toEqual(
      applicationStatuses.filter((status) => status !== "rejected"),
    );
    expect(applicationActivePipelineStatuses).not.toContain("rejected");
  });

  test("normalizeApplicationStatus maps legacy statuses to canonical", () => {
    for (const [legacy, canonical] of Object.entries(
      legacyApplicationStatusMap,
    )) {
      expect(normalizeApplicationStatus(legacy)).toBe(canonical);
    }
  });

  test("normalizeApplicationStatus passes canonical statuses through", () => {
    for (const status of applicationStatuses) {
      expect(normalizeApplicationStatus(status)).toBe(status);
    }
  });

  test("normalizeApplicationStatus returns null for unknown statuses", () => {
    expect(normalizeApplicationStatus("not_a_status")).toBeNull();
  });
});

describe("buildNormalizedStatusCase", () => {
  test("maps every legacy status, keeps canonical statuses, defaults unknown/null to ai_screening", () => {
    const caseExpr = buildNormalizedStatusCase();

    for (const [legacy, canonical] of Object.entries(
      legacyApplicationStatusMap,
    )) {
      expect(caseExpr).toContain(
        `WHEN la.status = '${legacy}' THEN '${canonical}'`,
      );
    }
    expect(caseExpr).toContain("WHEN la.status IS NULL THEN 'ai_screening'");
    for (const status of applicationStatuses) {
      expect(caseExpr).toContain(`'${status}'`);
    }
    expect(caseExpr).toContain("THEN la.status");
    expect(caseExpr).toContain("ELSE 'ai_screening'");
  });
});

describe("pickLatestApplication", () => {
  const row = (id: string, status: string, updatedAt: string) => ({
    id,
    status,
    updatedAt: new Date(updatedAt),
  });

  test("returns null for no applications", () => {
    expect(pickLatestApplication([])).toBeNull();
  });

  test("picks the most recently updated application", () => {
    const apps = [
      row("a", "rejected", "2026-09-01T00:00:00.000Z"),
      row("b", "first_round", "2026-09-03T00:00:00.000Z"),
      row("c", "ai_screening", "2026-09-02T00:00:00.000Z"),
    ];
    expect(pickLatestApplication(apps)?.id).toBe("b");
  });

  test("breaks updated_at ties by highest id (matching the kanban CTE)", () => {
    const apps = [
      row("a-low", "rejected", "2026-09-01T00:00:00.000Z"),
      row("b-high", "first_round", "2026-09-01T00:00:00.000Z"),
    ];
    expect(pickLatestApplication(apps)?.id).toBe("b-high");
  });

  test("does not mutate the input array", () => {
    const apps = [
      row("a", "rejected", "2026-09-01T00:00:00.000Z"),
      row("b", "first_round", "2026-09-03T00:00:00.000Z"),
    ];
    pickLatestApplication(apps);
    expect(apps[0]?.id).toBe("a");
  });
});
