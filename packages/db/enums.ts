export const departments = [
  "management",
  "capital-markets",
  "deal-team",
  "legal",
  "operations",
  "origination",
  "pipe",
  "public-markets",
] as const;
export type Department = (typeof departments)[number];

export const hireLevels = [
  "managing-director",
  "vice-president",
  "associate",
  "analyst",
  "intern",
] as const;
export type HireLevel = (typeof hireLevels)[number];

export const positionStatuses = [
  "active",
  "hold",
  "passed",
  "upcoming",
] as const;
export type PositionStatus = (typeof positionStatuses)[number];

export const candidateDocumentCategories = [
  "resume",
  "cover-letter",
  "portfolio",
  "other",
] as const;
export type CandidateDocumentCategory =
  (typeof candidateDocumentCategories)[number];

export const questionTypes = ["text", "video", "audio", "mcq"] as const;
export type QuestionType = (typeof questionTypes)[number];

export const questionCategories = [
  "screening",
  "technical",
  "behavioral",
] as const;
export type QuestionCategory = (typeof questionCategories)[number];

export const interviewStatuses = [
  "pending",
  "completed",
  "move_forward",
  "rejected",
  "scheduled",
] as const;
export type InterviewStatus = (typeof interviewStatuses)[number];

export const interviewModes = ["manual", "ai_session"] as const;
export type InterviewMode = (typeof interviewModes)[number];

export const applicationStatuses = [
  "ai_screening",
  "first_round",
  "offer_agreement",
  "technical_round",
  "contract_offer",
  "onboarding",
  "rejected",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const personalities = [
  "ENFJ",
  "ENFP",
  "ENTJ",
  "ENTP",
  "ESFJ",
  "ESFP",
  "ESTJ",
  "ESTP",
  "INFJ",
  "INTJ",
  "INTP",
  "ISFJ",
  "ISFP",
  "ISTJ",
  "ISTP",
] as const;
export type Personality = (typeof personalities)[number];

export const documentCategories = [
  "job-description",
  "onboarding",
  "policy",
  "hr-form",
  "other",
] as const;
export type DocumentCategoryValue = (typeof documentCategories)[number];

export const sourcingChannels = [
  "linkedin",
  "indeed",
  "upwork",
  "handshake",
  "internal-referrals",
  "university-portals",
  "agency",
  "other",
] as const;
export type SourcingChannel = (typeof sourcingChannels)[number];

export const interviewSessionStatuses = [
  "pending",
  "invited",
  "in_progress",
  "completed",
  "reviewed",
] as const;
export type InterviewSessionStatus =
  (typeof interviewSessionStatuses)[number];

export const interviewEvaluationRecommendations = [
  "strong_hire",
  "hire",
  "maybe",
  "reject",
] as const;
export type InterviewEvaluationRecommendation =
  (typeof interviewEvaluationRecommendations)[number];

export const deliveryModes = ["form", "voice", "hybrid"] as const;
export type DeliveryMode = (typeof deliveryModes)[number];

export const inputMethods = ["typed", "mcq", "voice"] as const;
export type InputMethod = (typeof inputMethods)[number];

export const cheatingEventTypes = [
  "TAB_SWITCHED",
  "WINDOW_BLUR",
  "FULLSCREEN_EXITED",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
] as const;
export type CheatingEventType = (typeof cheatingEventTypes)[number];

export interface AgentConfig {
  provider: "openai";
  voice?: string;
  language?: string;
  instructions?: string;
}

export interface CheatingSummary {
  tabSwitches?: number;
  focusLostSeconds?: number;
  fullscreenExits?: number;
  copyAttempts?: number;
  pasteAttempts?: number;
}
