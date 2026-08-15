import { describe, expect, test } from "bun:test";

import {
  applicationActivePipelineStatuses,
  buildNormalizedStatusCase,
  legacyApplicationStatusMap,
  normalizeApplicationStatus,
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
  test("maps every legacy status and defaults unknown/null to ai_screening", () => {
    const caseExpr = buildNormalizedStatusCase();

    for (const [legacy, canonical] of Object.entries(
      legacyApplicationStatusMap,
    )) {
      expect(caseExpr).toContain(
        `WHEN la.status = '${legacy}' THEN '${canonical}'`,
      );
    }
    expect(caseExpr).toContain("WHEN la.status IS NULL THEN 'ai_screening'");
    expect(caseExpr).toContain("ELSE 'ai_screening'");
    expect(caseExpr).not.toContain("ELSE la.status");
  });
});
