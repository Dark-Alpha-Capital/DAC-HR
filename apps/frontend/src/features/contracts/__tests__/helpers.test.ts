import { describe, expect, test } from "bun:test";
import {
  formatOfferDate,
  renderContractTemplate,
} from "../helpers";

const baseValues = {
  candidateName: "Ada Lovelace",
  positionName: "Analyst",
  compensation: "150,000",
};

describe("renderContractTemplate", () => {
  test("substitutes every known token", () => {
    const body =
      "This agreement is between {{candidateName}} and DAC for the {{positionName}} role at {{compensation}}.";

    const out = renderContractTemplate(body, baseValues);

    expect(out).toBe(
      "This agreement is between Ada Lovelace and DAC for the Analyst role at 150,000.",
    );
    expect(out).not.toContain("{{");
  });

  test("auto-fills the candidate name wherever required", () => {
    const body =
      "{{candidateName}} acknowledges the offer. Signed: {{candidateName}}";

    const out = renderContractTemplate(body, baseValues);

    expect(out).toBe(
      "Ada Lovelace acknowledges the offer. Signed: Ada Lovelace",
    );
  });

  test("normalizes whitespace inside tokens", () => {
    const out = renderContractTemplate(
      "Welcome {{ candidateName }}.",
      baseValues,
    );
    expect(out).toBe("Welcome Ada Lovelace.");
  });

  test("throws listing every missing token (fail loudly)", () => {
    const body =
      "Dear {{candidateName}}, start date {{startDate}} at {{location}}.";

    expect(() => renderContractTemplate(body, baseValues)).toThrowError(
      /missing merge values for: location, startDate/,
    );
  });

  test("leaves text that only resembles a token untouched", () => {
    const body = "Clause 12.1 {{ not a real token }} and {{ok}}";
    // inner spaces make it invalid token syntax -> kept verbatim, only ok resolves
    const out = renderContractTemplate(body, {
      ok: "fine",
      candidateName: "Ada",
    });
    expect(out).toBe("Clause 12.1 {{ not a real token }} and fine");
  });

  test("coerces numbers and booleans to text", () => {
    const body = "Sign bonus {{bonus}}; relocation {{relocation}}";
    const out = renderContractTemplate(body, {
      bonus: 25000,
      relocation: true,
    });
    expect(out).toBe("Sign bonus 25000; relocation true");
  });
});

describe("formatOfferDate", () => {
  test("formats as a readable date", () => {
    const out = formatOfferDate(new Date("2026-09-07T12:00:00Z"));
    expect(out).toBe("September 7, 2026");
  });
});
