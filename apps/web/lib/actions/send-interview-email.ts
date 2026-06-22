import { defineAction } from "./create-action";
import { db } from "@workspace/db/db";
import { interviewSession } from "@workspace/db/schema";
import { eq } from "@workspace/db";
import { getSession } from "@/lib/middleware/auth-guard";
import { getSessionByToken } from "@workspace/db/repositories/interview-session-repository";
import { Resend } from "resend";

export interface SendInterviewEmailInput {
  token: string;
  recipientEmail: string;
  interviewLink: string;
}

export const sendInterviewEmail = defineAction(async (
  data: SendInterviewEmailInput,
): Promise<{ sentAt: Date } | { error: string }> => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const { token, recipientEmail, interviewLink } = data;

  const row = await getSessionByToken(token);
  if (!row) {
    return { error: "Interview session not found" };
  }

  if (row.session.status === "completed" || row.session.status === "reviewed") {
    return { error: "This interview has already been completed" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { error: "Email service is not configured" };
  }

  const resend = new Resend(apiKey);
  const candidateName = `${row.candidate.firstName} ${row.candidate.lastName}`;
  const positionName = row.position.name;
  const expiresAt = row.session.expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const { error: sendError } = await resend.emails.send({
    from: "Dark Alpha Capital <noreply@darkalphacapital.com>",
    to: recipientEmail,
    subject: `AI Screening Interview — ${positionName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0a0a0a; padding: 24px 32px;">
          <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0; letter-spacing: -0.01em;">Dark Alpha Capital</p>
        </div>
        <div style="padding: 40px 32px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #0a0a0a; margin: 0 0 8px;">Hello, ${candidateName}</h1>
          <p style="font-size: 16px; color: #525252; margin: 0 0 24px; line-height: 1.6;">
            You have been invited to complete an AI screening interview for the <strong style="color: #0a0a0a;">${positionName}</strong> position at Dark Alpha Capital.
          </p>
          <p style="font-size: 14px; color: #525252; margin: 0 0 32px; line-height: 1.6;">
            The interview consists of a series of questions and will take approximately 30 minutes. Find a quiet place with a stable internet connection before you begin.
          </p>
          <a href="${interviewLink}" style="display: inline-block; background: #0a0a0a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 500;">
            Begin Interview
          </a>
          <p style="font-size: 13px; color: #737373; margin: 32px 0 0; line-height: 1.5;">
            This link expires on ${expiresAt}. If you have any questions, please reach out to your recruiter.
          </p>
          <p style="font-size: 13px; color: #a3a3a3; margin: 8px 0 0;">
            Or copy this URL: ${interviewLink}
          </p>
        </div>
        <div style="border-top: 1px solid #e5e5e5; padding: 20px 32px;">
          <p style="font-size: 12px; color: #a3a3a3; margin: 0;">Dark Alpha Capital · AI Screening Platform</p>
        </div>
      </div>
    `,
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return { error: "Failed to send email" };
  }

  const sentAt = new Date();

  await db
    .update(interviewSession)
    .set({ emailSentAt: sentAt, emailSentTo: recipientEmail })
    .where(eq(interviewSession.id, row.session.id));

  return { sentAt };
});
