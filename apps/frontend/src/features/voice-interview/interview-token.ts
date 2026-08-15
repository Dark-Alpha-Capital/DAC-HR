import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type { BundleRoundSummary } from "#/features/voice-interview/components/bundle-rounds-overview";
import type {
  DeliveryMode,
  RoundDeliveryMode,
} from "#/lib/enums";
import {
  deliveryModes,
  roundDeliveryModes,
} from "#/lib/enums";
import { queryKeys } from "#/lib/query/query-keys";
import {
  toSessionMode,
  type SessionMode,
} from "#/features/voice-interview/interview-flow";

export interface InterviewQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string | null;
  timeLimitSeconds: number | null;
  options?: import("#/lib/question-types").QuestionOption[] | null;
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
  deliveryMode: RoundDeliveryMode;
  status: string;
  roundOrder: number;
  sessionId?: string | null;
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
  candidateEmail?: string;
  positionName: string;
  roundName?: string;
  deliveryMode: DeliveryMode;
  currentRoundIndex: number;
  totalRounds: number;
  sessionId?: string | null;
  rounds: ValidationRound[];
}

export interface LegacyValidationResponse {
  valid: true;
  type: "legacy";
  status: string;
  candidateName: string;
  candidateEmail?: string;
  positionName: string;
  roundName: string;
  deliveryMode: DeliveryMode;
  sessionId?: string | null;
}

export type ValidationResponse =
  | BundleValidationResponse
  | LegacyValidationResponse;

export interface CompleteInterviewResponse {
  hasMoreRounds?: boolean;
  allCompleted?: boolean;
  totalRounds?: number;
  nextRoundName?: string | null;
  nextRound?: {
    roundName: string;
    roundOrder: number;
    deliveryMode: RoundDeliveryMode;
    sessionId?: string | null;
  } | null;
  error?: string;
}

const deliveryModeSchema = z.enum(deliveryModes);
const roundDeliveryModeSchema = z.enum(roundDeliveryModes);

const validationRoundSchema = z.object({
  roundName: z.string(),
  deliveryMode: roundDeliveryModeSchema,
  status: z.string(),
  roundOrder: z.number(),
  sessionId: z.string().nullable().optional(),
});

const validationResponseSchema = z.discriminatedUnion("type", [
  z.object({
    valid: z.literal(true),
    type: z.literal("bundle"),
    status: z.string(),
    candidateName: z.string(),
    candidateEmail: z.string().optional(),
    positionName: z.string(),
    roundName: z.string().optional(),
    deliveryMode: deliveryModeSchema,
    currentRoundIndex: z.number(),
    totalRounds: z.number(),
    sessionId: z.string().nullable().optional(),
    rounds: z.array(validationRoundSchema),
  }),
  z.object({
    valid: z.literal(true),
    type: z.literal("legacy"),
    status: z.string(),
    candidateName: z.string(),
    candidateEmail: z.string().optional(),
    positionName: z.string(),
    roundName: z.string(),
    deliveryMode: deliveryModeSchema,
    sessionId: z.string().nullable().optional(),
  }),
]);

const validationErrorSchema = z.object({
  valid: z.literal(false).optional(),
  error: z.string().optional(),
});

export async function parseValidationResponse(
  response: Response,
): Promise<ValidationResponse | ValidationErrorResponse> {
  const data: unknown = await response.json();
  const parsed = validationResponseSchema.safeParse(data);
  if (parsed.success) {
    return parsed.data;
  }
  const errorParsed = validationErrorSchema.safeParse(data);
  if (errorParsed.success) {
    return errorParsed.data;
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
    // SAFETY: bundle-round status is stored as one of pending/in_progress/
    // completed, which matches BundleRoundSummary["status"].
    status: round.status as BundleRoundSummary["status"],
    roundOrder: round.roundOrder,
  }));
}

export async function fetchInterviewTokenValidation(
  token: string,
): Promise<ValidationResponse> {
  const response = await fetch(`/api/interview-token/${token}/validate`);
  const body = await parseValidationResponse(response);

  if (!response.ok || body.valid !== true) {
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
    // SAFETY: the schema endpoint returns `{ error }` for failed lookups.
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error || "Failed to load interview");
  }
  // SAFETY: a 200 from the schema endpoint is the serialized InterviewSchemaData.
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
  // SAFETY: the complete endpoint returns a CompleteInterviewResponse; on a
  // non-JSON failure response we fall back to an empty payload.
  return (await response.json().catch(() => ({}))) as CompleteInterviewResponse;
}

export function interviewTokenValidateOptions(token: string) {
  return queryOptions({
    queryKey: queryKeys.interviewToken.validate(token),
    queryFn: () => fetchInterviewTokenValidation(token),
    retry: false,
  });
}

export function interviewSchemaOptions(token: string, sessionId?: string) {
  return queryOptions({
    queryKey: queryKeys.interviewToken.schema(token, sessionId),
    queryFn: () => fetchInterviewSchema(token),
    retry: false,
  });
}

export function getModeStorageKey(token: string) {
  return `interview-mode:${token}`;
}

export function resolveSessionMode(
  validation: ValidationResponse,
  token: string,
): SessionMode {
  // SAFETY: the stored value is a SessionMode serialized by the voice
  // interview flow under this token's key; null when never persisted.
  const storedMode = sessionStorage.getItem(
    getModeStorageKey(token),
  ) as SessionMode | null;

  if (validation.type === "bundle") {
    return toSessionMode(validation.deliveryMode);
  }
  if (storedMode) {
    return storedMode;
  }
  return toSessionMode(validation.deliveryMode);
}

export interface WelcomeData {
  candidateName: string;
  candidateEmail?: string;
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
    candidateEmail: validation.candidateEmail,
    positionName: validation.positionName,
    roundName: validation.roundName ?? "Interview",
    deliveryMode: validation.deliveryMode,
    currentRoundIndex: isBundle ? validation.currentRoundIndex : undefined,
    totalRounds: isBundle ? validation.totalRounds : undefined,
    interviewType: isBundle ? "bundle" : "legacy",
    rounds: isBundle ? mapValidationRounds(validation.rounds) : undefined,
  };
}
