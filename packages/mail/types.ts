// Email job types for async side-effect / workflow dispatch
export type EmailJobType =
  | "auth-email"
  | "interview-invite"
  | "interview-completed"
  | "onboarding-welcome";

export interface BaseEmailJobData {
  type: EmailJobType;
  to: string;
}

/** Raw auth email (verification / password reset) carrying subject + html. */
export interface AuthEmailJobData extends BaseEmailJobData {
  type: "auth-email";
  subject: string;
  html: string;
}

export interface InterviewInviteJobData extends BaseEmailJobData {
  type: "interview-invite";
  candidateName: string;
  positionName: string;
  interviewUrl: string;
  /** ISO-8601 timestamp the interview link expires. */
  expiresAt: string;
  /** Optional personalized subject line (placeholders already substituted). */
  subject?: string;
  /** Optional personalized intro paragraph (placeholders already substituted). */
  customMessage?: string;
}

/** Auto-fired when the candidate completes every round of their interview. */
export interface InterviewCompletedJobData extends BaseEmailJobData {
  type: "interview-completed";
  candidateName: string;
  positionName: string;
}

export interface OnboardingWelcomeJobData extends BaseEmailJobData {
  type: "onboarding-welcome";
  candidateName: string;
  positionName: string;
  location?: string | null;
  startDate?: string | null;
  contactEmail: string;
}

export type EmailJobData =
  | AuthEmailJobData
  | InterviewInviteJobData
  | InterviewCompletedJobData
  | OnboardingWelcomeJobData;

// Email configuration
export const EMAIL_CONFIG = {
  from: "DARK ALPHA CAPITAL <people@darkalphacapital.com>",
  defaultAdminEmail: "people@darkalphacapital.com",
} as const;
