/**
 * Email templates for transactional mail.
 * Each template is a pure function from typed data to subject/html/text so it
 * can be unit-tested without a mail client.
 */

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const BRANDING_HTML = `
<div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
`;

const BRANDING_TEXT = "Dark Alpha Capital\n==================";

function wrapHtml(body: string): string {
  return `${BRANDING_HTML}${body}
</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface InterviewInviteTemplateData {
  candidateName: string;
  positionName: string;
  interviewUrl: string;
  expiresAt: Date;
}

function renderInterviewInvite(
  data: InterviewInviteTemplateData,
): RenderedEmail {
  const expiresAt = new Date(data.expiresAt);
  const expiresText = Number.isNaN(expiresAt.getTime())
    ? "72 hours"
    : new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(expiresAt);

  const html = wrapHtml(`
  <h1 style="font-size: 22px; margin: 0 0 8px;">Hi ${escapeHtml(data.candidateName)},</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #444;">You have been invited to complete a round of interviews for the <strong>${escapeHtml(data.positionName)}</strong> position at Dark Alpha Capital.</p>
  <p style="font-size: 15px; line-height: 1.6; color: #444;">Click the link below to begin. The link is valid until <strong>${escapeHtml(expiresText)}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${escapeHtml(data.interviewUrl)}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 24px; font-size: 15px;">Start my interview</a>
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="font-size: 13px; line-height: 1.5; word-break: break-all; color: #888;">${escapeHtml(data.interviewUrl)}</p>
  <p style="font-size: 13px; line-height: 1.6; color: #888; margin-top: 24px;">This is an automated message. Please do not reply to this email.</p>
`);

  const text = `${BRANDING_TEXT}

Hi ${data.candidateName},

You have been invited to complete a round of interviews for the ${data.positionName} position at Dark Alpha Capital.

Start your interview here (valid until ${expiresText}):
${data.interviewUrl}

This is an automated message. Please do not reply to this email.`;

  return { subject: `Interview invitation — ${data.positionName}`, html, text };
}

export interface OnboardingWelcomeTemplateData {
  candidateName: string;
  positionName: string;
  location?: string | null;
  startDate?: string | null;
  contactEmail: string;
}

function renderOnboardingWelcome(
  data: OnboardingWelcomeTemplateData,
): RenderedEmail {
  const locationLine = data.location
    ? `<li>Location: <strong>${escapeHtml(data.location)}</strong></li>`
    : "";
  const startLine = data.startDate
    ? `<li>Start date: <strong>${escapeHtml(data.startDate)}</strong></li>`
    : "";

  const html = wrapHtml(`
  <h1 style="font-size: 22px; margin: 0 0 8px;">Welcome to Dark Alpha Capital, ${escapeHtml(data.candidateName)}!</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #444;">We're excited to have you join as <strong>${escapeHtml(data.positionName)}</strong>. Here is the information you need to get started:</p>
  <ul style="font-size: 15px; line-height: 1.8; color: #444;">
    ${locationLine}
    ${startLine}
    <li>For any questions, reach out to <a href="mailto:${escapeHtml(data.contactEmail)}" style="color: #1a1a1a;">${escapeHtml(data.contactEmail)}</a></li>
  </ul>
  <p style="font-size: 15px; line-height: 1.6; color: #444;">Our people team will follow up with onboarding documents and next steps shortly.</p>
  <p style="font-size: 13px; line-height: 1.6; color: #888; margin-top: 24px;">This is an automated message. Please do not reply to this email.</p>
`);

  const text = `${BRANDING_TEXT}

Welcome to Dark Alpha Capital, ${data.candidateName}!

We're excited to have you join as ${data.positionName}. Here is the information you need to get started:
- ${data.location ? `Location: ${data.location}` : "Location: TBD"}
- ${data.startDate ? `Start date: ${data.startDate}` : "Start date: TBD"}
- For any questions, reach out to ${data.contactEmail}

Our people team will follow up with onboarding documents and next steps shortly.

This is an automated message. Please do not reply to this email.`;

  return {
    subject: `Welcome to Dark Alpha Capital — ${data.positionName}`,
    html,
    text,
  };
}

export const templates = {
  "interview-invite": {
    render: renderInterviewInvite,
  },
  "onboarding-welcome": {
    render: renderOnboardingWelcome,
  },
} as const;

export type EmailTemplateName = keyof typeof templates;
