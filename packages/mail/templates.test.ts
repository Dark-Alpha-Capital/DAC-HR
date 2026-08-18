import { test, expect } from "bun:test";
import { renderEmailTemplate, processEmailJob } from "./index";
import type { EmailJobData } from "./types";

test("auth-email renders raw subject and html", async () => {
  const jobData: EmailJobData = {
    type: "auth-email",
    to: "user@darkalphacapital.com",
    subject: "Reset your password",
    html: "<p>Click the link to reset your password.</p>",
  };

  const rendered = await renderEmailTemplate(jobData);
  expect(rendered.subject).toBe("Reset your password");
  expect(rendered.html).toContain("Click the link to reset your password");
});

test("interview-invite renders subject, html with data", async () => {
  const jobData: EmailJobData = {
    type: "interview-invite",
    to: "candidate@example.com",
    candidateName: "Jane Doe",
    positionName: "Analyst",
    interviewUrl: "https://recruiting.darkalphacapital.com/interview/abc123",
    expiresAt: new Date("2026-08-10T12:00:00Z").toISOString(),
  };

  const rendered = await renderEmailTemplate(jobData);
  expect(rendered.subject).toBe("Interview invitation — Analyst");
  expect(rendered.html).toContain("Jane Doe");
  expect(rendered.html).toContain(
    "https://recruiting.darkalphacapital.com/interview/abc123",
  );
});

test("interview-completed renders thanks message with data", async () => {
  const jobData: EmailJobData = {
    type: "interview-completed",
    to: "candidate@example.com",
    candidateName: "Jane Doe",
    positionName: "Analyst",
  };

  const rendered = await renderEmailTemplate(jobData);
  expect(rendered.subject).toBe("Thank you for completing your interview");
  expect(rendered.html).toContain("Jane Doe");
  expect(rendered.html).toContain("Analyst");
  expect(rendered.html).toContain("recorded");
});

test("onboarding-welcome renders with optional fields omitted", async () => {
  const jobData: EmailJobData = {
    type: "onboarding-welcome",
    to: "candidate@example.com",
    candidateName: "John Smith",
    positionName: "Software Engineer",
    contactEmail: "people@darkalphacapital.com",
  };

  const rendered = await renderEmailTemplate(jobData);
  expect(rendered.subject).toContain("Welcome to Dark Alpha Capital");
  expect(rendered.html).toContain("Location");
  expect(rendered.html).toContain("TBD");
  expect(rendered.html).toContain("people@darkalphacapital.com");
});

test("onboarding-welcome includes location when provided", async () => {
  const jobData: EmailJobData = {
    type: "onboarding-welcome",
    to: "candidate@example.com",
    candidateName: "John Smith",
    positionName: "Software Engineer",
    location: "Philadelphia, PA",
    contactEmail: "people@darkalphacapital.com",
  };

  const rendered = await renderEmailTemplate(jobData);
  expect(rendered.html).toContain("Philadelphia, PA");
});

test("processEmailJob renders, sends, and returns the send result", async () => {
  const jobData: EmailJobData = {
    type: "auth-email",
    to: "user@darkalphacapital.com",
    subject: "Verify your email",
    html: "<p>Verify link</p>",
  };

  const sentMessages: Array<{
    to: string;
    subject: string;
    html: string;
  }> = [];
  // SAFETY: test double implements only the Resend `emails.send` surface processEmailJob uses.
  const fakeResend = {
    emails: {
      send: async (message: { to: string; subject: string; html: string }) => {
        sentMessages.push(message);
        return { data: { id: "resend-123" }, error: null };
      },
    },
  } as never;

  const result = await processEmailJob(fakeResend, jobData, {
    idempotencyKey: "outbox-row-1",
  });

  expect(result.success).toBe(true);
  expect(result.emailId).toBe("resend-123");
  expect(result.to).toBe("user@darkalphacapital.com");
  expect(result.type).toBe("auth-email");
  expect(sentMessages[0]?.subject).toBe("Verify your email");
});
