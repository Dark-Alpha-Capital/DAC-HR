import {
  createResendClient,
  processEmailJob,
  type EmailJobData,
} from "@workspace/mail";

export async function runOutboundEmailSend(
  data: EmailJobData,
  opts?: { idempotencyKey?: string },
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  const resend = createResendClient(key);
  return processEmailJob(resend, data, opts);
}
