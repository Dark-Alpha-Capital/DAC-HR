import { z } from "zod";
import type { EmailJobData } from "@workspace/mail";
import type { JsonValue } from "#/lib/types/json";

const emailJobDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("auth-email"),
    to: z.string(),
    subject: z.string(),
    html: z.string(),
  }),
  z.object({
    type: z.literal("interview-invite"),
    to: z.string(),
    candidateName: z.string(),
    positionName: z.string(),
    interviewUrl: z.string(),
    expiresAt: z.string(),
    subject: z.string().optional(),
    customMessage: z.string().optional(),
  }),
  z.object({
    type: z.literal("interview-completed"),
    to: z.string(),
    candidateName: z.string(),
    positionName: z.string(),
  }),
  z.object({
    type: z.literal("onboarding-welcome"),
    to: z.string(),
    candidateName: z.string(),
    positionName: z.string(),
    location: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    contactEmail: z.string(),
  }),
]) satisfies z.ZodType<EmailJobData>;

/** Parse email queue job data at the consumer I/O boundary. */
export function parseEmailJobData(value: JsonValue): EmailJobData {
  return emailJobDataSchema.parse(value);
}
