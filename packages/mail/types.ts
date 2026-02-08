// Email job types for BullMQ queue
export type EmailJobType =
    | "onboarding-investor-confirmation"
    | "onboarding-admin-notification"
    | "welcome-employee"
    | "application-rejection"
    | "generic";

export interface BaseEmailJobData {
    type: EmailJobType;
    to: string;
}

export interface OnboardingInvestorConfirmationJobData extends BaseEmailJobData {
    type: "onboarding-investor-confirmation";
    primaryContactName: string;
    organizationName: string;
}

export interface OnboardingAdminNotificationJobData extends BaseEmailJobData {
    type: "onboarding-admin-notification";
    organizationName: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone: string;
    investorType: string;
    capitalProviderType: string;
    onboardingId: string;
    fileCount: number;
    submittedAt: string;
}

export interface WelcomeEmployeeJobData extends BaseEmailJobData {
    type: "welcome-employee";
    employeeName: string;
    position?: string;
    startDate?: string;
}

export interface ApplicationRejectionJobData extends BaseEmailJobData {
    type: "application-rejection";
    candidateName: string;
    positionTitle: string;
}

export interface GenericEmailJobData extends BaseEmailJobData {
    type: "generic";
    subject: string;
    body: string;
    preheader?: string;
}

export type EmailJobData =
    | OnboardingInvestorConfirmationJobData
    | OnboardingAdminNotificationJobData
    | WelcomeEmployeeJobData
    | ApplicationRejectionJobData
    | GenericEmailJobData;

// Email configuration
export const EMAIL_CONFIG = {
    from: "DARK ALPHA CAPITAL <investors@darkalphacapital.com>",
    hrFrom: "DARK ALPHA CAPITAL HR <hr@darkalphacapital.com>",
    defaultAdminEmail: "admin@darkalphacapital.com",
} as const;
