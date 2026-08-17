import { test, expect } from "bun:test";
import { renderEmail } from "./index";

test("interview-invite renders subject, html and text with data", async () => {
  const rendered = await renderEmail("interview-invite", {
    candidateName: "Jane Doe",
    positionName: "Analyst",
    interviewUrl: "https://recruiting.darkalphacapital.com/interview/abc123",
    expiresAt: new Date("2026-08-10T12:00:00Z"),
  });

  expect(rendered.subject).toBe("Interview invitation — Analyst");
  expect(rendered.text).toContain("Jane Doe");
  expect(rendered.text).toContain(
    "https://recruiting.darkalphacapital.com/interview/abc123",
  );
  expect(rendered.html).toContain("Start my interview");
  expect(rendered.html).toContain("Analyst");
});

test("onboarding-welcome renders with optional fields omitted", async () => {
  const rendered = await renderEmail("onboarding-welcome", {
    candidateName: "John Smith",
    positionName: "Software Engineer",
    contactEmail: "people@darkalphacapital.com",
  });

  expect(rendered.subject).toContain("Welcome to Dark Alpha Capital");
  expect(rendered.text).toContain("Location: TBD");
  expect(rendered.html).toContain("people@darkalphacapital.com");
});

test("onboarding-welcome includes location when provided", async () => {
  const rendered = await renderEmail("onboarding-welcome", {
    candidateName: "John Smith",
    positionName: "Software Engineer",
    location: "Philadelphia, PA",
    contactEmail: "people@darkalphacapital.com",
  });

  expect(rendered.html).toContain("Philadelphia, PA");
  expect(rendered.text).toContain("Location: Philadelphia, PA");
});
