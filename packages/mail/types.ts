// Email job types for async side-effect / workflow dispatch
export type EmailJobType =
  | "auth-email"
  | "interview-invite"
  | "interview-completed"
  | "onboarding-welcome"
  | "contract-review"
  | "internal-notice";

export interface BaseEmailJobData {
  type: EmailJobType;
  to: string;
  /** Optional recipient(s) to copy on the email (recruiter/team visibility). */
  cc?: string | string[];
}

/** Raw auth email (verification / password reset) carrying subject + html. */
export interface AuthEmailJobData extends BaseEmailJobData {
  type: "auth-email";
  subject: string;
  html: string;
}

/**
 * Internal (recruiting/HR) notification carrying raw subject + html — used to
 * alert the team when a candidate takes a contract action that needs a human
 * follow-up (e.g. "wants to discuss terms"). Never sent to candidates.
 */
export interface InternalNoticeJobData extends BaseEmailJobData {
  type: "internal-notice";
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

/**
 * Contract sent to a candidate for review. Links to the public token-scoped
 * review page where the candidate reads the merged contract and affirms
 * receipt (or asks to negotiate).
 */
export interface ContractReviewJobData extends BaseEmailJobData {
  type: "contract-review";
  candidateName: string;
  positionName: string;
  /** Absolute URL of the public contract review page (/contract/<token>/review). */
  reviewUrl: string;
  /** Optional personalized subject line (placeholders already substituted). */
  subject?: string;
  /** Optional personalized intro paragraph (placeholders already substituted). */
  customMessage?: string;
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
  | OnboardingWelcomeJobData
  | ContractReviewJobData
  | InternalNoticeJobData;

// Email configuration
export const EMAIL_CONFIG = {
  from: "DARK ALPHA CAPITAL <people@darkalphacapital.com>",
  defaultAdminEmail: "people@darkalphacapital.com",
} as const;
