import { Resend } from "resend";
import { render } from "@react-email/components";
import {
  InterviewInviteEmail,
  InterviewCompletedEmail,
  OnboardingWelcomeEmail,
  ContractReviewEmail,
} from "./emails";
import type { EmailJobData } from "./types";
import { EMAIL_CONFIG } from "./types";

// Re-export types and emails
export * from "./types";
export * from "./emails";
export * from "./template-utils";

// Re-export render function for email templates
export { render } from "@react-email/components";

/**
 * Create a Resend client instance
 */
export const createResendClient = (apiKey: string) => {
  return new Resend(apiKey);
};

/**
 * Render an email template based on job data
 * Returns the subject and HTML content
 */
export const renderEmailTemplate = async (
  jobData: EmailJobData,
): Promise<{ subject: string; html: string }> => {
  switch (jobData.type) {
    case "auth-email": {
      return { subject: jobData.subject, html: jobData.html };
    }

    case "interview-invite": {
      const subject =
        jobData.subject ?? `Interview invitation — ${jobData.positionName}`;
      const html = await render(
        InterviewInviteEmail({
          candidateName: jobData.candidateName,
          positionName: jobData.positionName,
          interviewUrl: jobData.interviewUrl,
          // SAFETY: job payloads store expiresAt as an ISO string (queue JSON);
          // the template formats it for the recipient.
          expiresAt: new Date(jobData.expiresAt),
          customMessage: jobData.customMessage,
        }),
      );
      return { subject, html };
    }

    case "interview-completed": {
      const subject = `Thank you for completing your interview`;
      const html = await render(
        InterviewCompletedEmail({
          candidateName: jobData.candidateName,
          positionName: jobData.positionName,
        }),
      );
      return { subject, html };
    }

    case "onboarding-welcome": {
      const subject = `Welcome to Dark Alpha Capital — ${jobData.positionName}`;
      const html = await render(
        OnboardingWelcomeEmail({
          candidateName: jobData.candidateName,
          positionName: jobData.positionName,
          location: jobData.location,
          startDate: jobData.startDate,
          contactEmail: jobData.contactEmail,
        }),
      );
      return { subject, html };
    }

    case "contract-review": {
      const subject =
        jobData.subject ??
        `Your contract for review — ${jobData.positionName}`;
      const html = await render(
        ContractReviewEmail({
          candidateName: jobData.candidateName,
          positionName: jobData.positionName,
          reviewUrl: jobData.reviewUrl,
          customMessage: jobData.customMessage,
        }),
      );
      return { subject, html };
    }

    case "internal-notice": {
      // Internal HR notice: subject + html arrive pre-rendered from the
      // feature service that enqueued them.
      return { subject: jobData.subject, html: jobData.html };
    }

    default: {
      const _exhaustive: never = jobData;
      // SAFETY: unreachable default; cast reads .type for the diagnostic message only.
      throw new Error(
        `Unknown email type: ${(_exhaustive as EmailJobData).type}`,
      );
    }
  }
};

/**
 * Send an email using Resend.
 *
 * `idempotencyKey` guards against duplicate sends when the queue redelivers a
 * message (at-least-once semantics): the key is stable per outbox row, so a
 * crash-after-send-but-before-ack cannot produce a second email.
 */
export const sendEmail = async (
  resend: Resend,
  to: string,
  subject: string,
  html: string,
  opts?: { idempotencyKey?: string; cc?: string | string[] },
) => {
  const response = await resend.emails.send(
    {
      from: EMAIL_CONFIG.from,
      to,
      subject,
      html,
      cc: opts?.cc,
    },
    opts?.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
  );

  if (response.error) {
    throw new Error(`Failed to send email: ${response.error.message}`);
  }

  return response.data;
};

/**
 * Process an email job - renders template and sends email
 */
export const processEmailJob = async (
  resend: Resend,
  jobData: EmailJobData,
  opts?: { idempotencyKey?: string },
) => {
  const { subject, html } = await renderEmailTemplate(jobData);
  const sendOpts = {
    idempotencyKey: opts?.idempotencyKey,
    cc: jobData.cc,
  };
  const result = await sendEmail(resend, jobData.to, subject, html, sendOpts);
  return {
    success: true,
    emailId: result?.id,
    to: jobData.to,
    cc: jobData.cc,
    type: jobData.type,
  };
};
