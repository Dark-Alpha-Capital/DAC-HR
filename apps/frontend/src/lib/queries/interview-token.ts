import { queryOptions } from "@tanstack/react-query";
import type { BundleRoundSummary } from "~/components/interview/BundleRoundsOverview";
import type { DeliveryMode } from "@workspace/db/enums";
import { queryKeys } from "~/lib/query/query-keys";

export interface InterviewQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds: number | null;
  options?: import("@workspace/db/question-types").QuestionOption[] | null;
}

export interface InterviewSchemaData {
  sessionId: string;
  candidateName: string;
  positionName: string;
  roundName: string;
  questions: InterviewQuestion[];
}

interface ValidationRound {
  roundName: string;
  deliveryMode: DeliveryMode;
  status: string;
  roundOrder: number;
}

interface ValidationErrorResponse {
  valid?: false;
  error?: string;
}

export interface BundleValidationResponse {
  valid: true;
  type: "bundle";
  status: string;
  candidateName: string;
  positionName: string;
  roundName?: string;
  deliveryMode: DeliveryMode;
  currentRoundIndex: number;
  totalRounds: number;
  rounds: ValidationRound[];
}

export interface LegacyValidationResponse {
  valid: true;
  type: "legacy";
  status: string;
  candidateName: string;
  positionName: string;
  roundName: string;
  deliveryMode: DeliveryMode;
}

export type ValidationResponse =
  | BundleValidationResponse
  | LegacyValidationResponse;

export interface CompleteInterviewResponse {
  hasMoreRounds?: boolean;
  nextRoundName?: string;
  error?: string;
}

export function isValidationResponse(
  data: unknown,
): data is ValidationResponse {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const record = data as Record<string, unknown>;
  return (
    record.valid === true &&
    (record.type === "bundle" || record.type === "legacy") &&
    typeof record.candidateName === "string" &&
    typeof record.positionName === "string"
  );
}

export async function parseValidationResponse(
  response: Response,
): Promise<ValidationResponse | ValidationErrorResponse> {
  const data: unknown = await response.json();
  if (isValidationResponse(data)) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    return data as ValidationErrorResponse;
  }

  return { valid: false, error: "Invalid validation response" };
}

export function mapValidationRounds(
  rounds: ValidationRound[] | undefined,
): BundleRoundSummary[] | undefined {
  if (!rounds) {
    return undefined;
  }

  return rounds.map((round) => ({
    roundName: round.roundName,
    deliveryMode: round.deliveryMode,
    status: round.status as BundleRoundSummary["status"],
    roundOrder: round.roundOrder,
  }));
}

export async function fetchInterviewTokenValidation(
  token: string,
): Promise<ValidationResponse> {
  const response = await fetch(`/api/interview-token/${token}/validate`);
  const body = await parseValidationResponse(response);

  if (!response.ok || !isValidationResponse(body)) {
    const errorMessage =
      "error" in body && body.error
        ? body.error
        : "Invalid interview link";
    throw new Error(errorMessage);
  }

  return body;
}

export async function fetchInterviewSchema(
  token: string,
): Promise<InterviewSchemaData> {
  const response = await fetch(`/api/interview-token/${token}/schema`);
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error || "Failed to load interview");
  }
  return response.json() as Promise<InterviewSchemaData>;
}

export async function completeInterview(
  token: string,
  tabSwitches: number,
): Promise<CompleteInterviewResponse> {
  const response = await fetch(`/api/interview-token/${token}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tabSwitches }),
  });
  return (await response.json().catch(() => ({}))) as CompleteInterviewResponse;
}

export function interviewTokenValidateOptions(token: string) {
  return queryOptions({
    queryKey: queryKeys.interviewToken.validate(token),
    queryFn: () => fetchInterviewTokenValidation(token),
    retry: false,
  });
}

export function interviewSchemaOptions(token: string) {
  return queryOptions({
    queryKey: queryKeys.interviewToken.schema(token),
    queryFn: () => fetchInterviewSchema(token),
    retry: false,
  });
}

export type SessionMode = "form" | "voice";

export function getModeStorageKey(token: string) {
  return `interview-mode:${token}`;
}

export function resolveSessionMode(
  validation: ValidationResponse,
  token: string,
): SessionMode {
  const storedMode = sessionStorage.getItem(
    getModeStorageKey(token),
  ) as SessionMode | null;

  if (validation.type === "bundle") {
    return validation.deliveryMode === "voice" ? "voice" : "form";
  }
  if (storedMode) {
    return storedMode;
  }
  if (validation.deliveryMode === "voice") {
    return "voice";
  }
  if (validation.deliveryMode === "form") {
    return "form";
  }
  return "form";
}

export interface WelcomeData {
  candidateName: string;
  positionName: string;
  roundName: string;
  deliveryMode: DeliveryMode;
  currentRoundIndex?: number;
  totalRounds?: number;
  interviewType?: "legacy" | "bundle";
  rounds?: BundleRoundSummary[];
}

export function buildWelcomeFromValidation(
  validation: ValidationResponse,
): WelcomeData {
  const isBundle = validation.type === "bundle";
  return {
    candidateName: validation.candidateName,
    positionName: validation.positionName,
    roundName: validation.roundName ?? "Interview",
    deliveryMode: validation.deliveryMode,
    currentRoundIndex: isBundle ? validation.currentRoundIndex : undefined,
    totalRounds: isBundle ? validation.totalRounds : undefined,
    interviewType: isBundle ? "bundle" : "legacy",
    rounds: isBundle ? mapValidationRounds(validation.rounds) : undefined,
  };
}
