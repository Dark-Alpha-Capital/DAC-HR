import {
  InterviewInviteEmail,
  type InterviewInviteTemplateData,
} from "./emails/interview-invite";
import {
  OnboardingWelcomeEmail,
  type OnboardingWelcomeTemplateData,
} from "./emails/onboarding-welcome";

export type { InterviewInviteTemplateData, OnboardingWelcomeTemplateData };

/**
 * Named email templates. Each entry pairs a subject builder with a React
 * Email component. The component is rendered to HTML/text at send time (see
 * `index.ts`), so these remain pure and unit-testable.
 */
export const templates = {
  "interview-invite": {
    subject: (data: InterviewInviteTemplateData) =>
      `Interview invitation — ${data.positionName}`,
    Component: InterviewInviteEmail,
  },
  "onboarding-welcome": {
    subject: (data: OnboardingWelcomeTemplateData) =>
      `Welcome to Dark Alpha Capital — ${data.positionName}`,
    Component: OnboardingWelcomeEmail,
  },
} as const;

export type EmailTemplateName = keyof typeof templates;
