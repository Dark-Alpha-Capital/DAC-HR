/**
 * Email template placeholders + substitution helpers.
 *
 * Templates store `{placeholder}` tokens; feature services substitute them with
 * real values at send time so the outbox payload carries fully-resolved text.
 */
export type EmailTemplateValues = {
  candidateName: string;
  positionName: string;
  link: string;
  expiresAt: string;
};

/** Placeholder metadata — drives the variable chips in the admin editor UI. */
export const EMAIL_TEMPLATE_VARIABLES: Array<{
  token: string;
  label: string;
  description: string;
}> = [
  {
    token: "{candidateName}",
    label: "Candidate name",
    description: "The candidate's full name",
  },
  {
    token: "{positionName}",
    label: "Position name",
    description: "The position they applied for",
  },
  {
    token: "{link}",
    label: "Interview link",
    description: "The shareable interview URL",
  },
  {
    token: "{expiresAt}",
    label: "Expiry date",
    description: "When the interview link expires",
  },
];

/**
 * Substitute known `{token}` placeholders. Unknown tokens are left untouched so
 * a typo doesn't silently render an empty string.
 */
export function substituteTemplate(
  template: string,
  values: EmailTemplateValues,
): string {
  return template.replace(
    /\{(candidateName|positionName|link|expiresAt)\}/g,
    (match, token: keyof EmailTemplateValues) => values[token],
  );
}

/** Human-readable expiry for email copy, e.g. "August 10, 2026 at 12:00 PM". */
export function formatEmailExpiry(expiresAt: Date): string {
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) {
    return "72 hours";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(expires);
}

/**
 * Fallback interview-invite template — mirrors the copy built into
 * `InterviewInviteEmail`. Used by the admin editor as the starting point until a
 * template row is saved (the built-in copy remains the render-time fallback).
 */
export const DEFAULT_INTERVIEW_INVITE_TEMPLATE = {
  subjectTemplate: "Interview invitation — {positionName}",
  bodyTemplate:
    "You have been invited to complete a round of interviews for the {positionName} position at Dark Alpha Capital. Click the button below to begin. The link is valid until {expiresAt}.",
} as const;
