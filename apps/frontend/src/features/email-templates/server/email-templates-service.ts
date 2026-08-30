import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { emailTemplate, type EmailTemplateType } from "@workspace/db/schema";
import {
  DEFAULT_INTERVIEW_INVITE_TEMPLATE,
  formatEmailExpiry,
  substituteTemplate,
} from "@workspace/mail";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export type EmailTemplateData = {
  type: EmailTemplateType;
  subjectTemplate: string;
  bodyTemplate: string;
  updatedAt: string | null;
};

export type SaveEmailTemplateInput = {
  type: EmailTemplateType;
  subjectTemplate: string;
  bodyTemplate: string;
};

export type ResolveInviteContentInput = {
  candidateName: string;
  positionName: string;
  interviewUrl: string;
  expiresAt: Date;
  /** Raw per-send override (placeholders allowed). Overrides the saved template. */
  overrideSubject?: string | null;
  overrideMessage?: string | null;
};

export type ResolvedInviteContent = {
  subject: string;
  customMessage: string;
};

export const emailTemplatesService = {
  getEmailTemplate,
  saveEmailTemplate,
  resolveInterviewInviteContent,
};

/** Select one saved template, or null when none has been customized. */
export async function getEmailTemplate(
  type: EmailTemplateType,
): Promise<EmailTemplateData | null> {
  const [row] = await db
    .select({
      type: emailTemplate.type,
      subjectTemplate: emailTemplate.subjectTemplate,
      bodyTemplate: emailTemplate.bodyTemplate,
      updatedAt: emailTemplate.updatedAt,
    })
    .from(emailTemplate)
    .where(eq(emailTemplate.type, type))
    .limit(1);

  if (!row) return null;

  return {
    type: row.type,
    subjectTemplate: row.subjectTemplate,
    bodyTemplate: row.bodyTemplate,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Upsert a saved template row and audit the change. */
export async function saveEmailTemplate(
  input: SaveEmailTemplateInput,
  actor: { id: string; email: string; name: string },
): Promise<{ success: true } | { error: string }> {
  const subjectTemplate = input.subjectTemplate.trim();
  const bodyTemplate = input.bodyTemplate.trim();

  if (!subjectTemplate || !bodyTemplate) {
    return { error: "Subject and body template are required" };
  }

  await db
    .insert(emailTemplate)
    .values({
      type: input.type,
      subjectTemplate,
      bodyTemplate,
      updatedBy: actor.id,
    })
    .onConflictDoUpdate({
      target: emailTemplate.type,
      set: {
        subjectTemplate,
        bodyTemplate,
        updatedBy: actor.id,
      },
    });

  insertAuditLog({
    userId: actor.id,
    action: "save_email_template",
    entityType: "email_template",
    entityId: input.type,
    details: {
      type: input.type,
      subjectTemplate,
      bodyTemplate,
      updatedBy: actor.email,
    },
  }).catch((error) => console.error("Audit log error:", error));

  return { success: true };
}

/**
 * Resolve the final subject + message for an interview invite. Resolution
 * order: per-send override → saved template → built-in default copy. All
 * placeholders are substituted here so the outbox payload carries resolved text.
 */
export async function resolveInterviewInviteContent(
  input: ResolveInviteContentInput,
): Promise<ResolvedInviteContent> {
  const saved = await getEmailTemplate("interview-invite");

  const subjectTemplate =
    input.overrideSubject?.trim() ||
    saved?.subjectTemplate ||
    DEFAULT_INTERVIEW_INVITE_TEMPLATE.subjectTemplate;

  const bodyTemplate =
    input.overrideMessage?.trim() ||
    saved?.bodyTemplate ||
    DEFAULT_INTERVIEW_INVITE_TEMPLATE.bodyTemplate;

  const values = {
    candidateName: input.candidateName,
    positionName: input.positionName,
    link: input.interviewUrl,
    expiresAt: formatEmailExpiry(input.expiresAt),
  };

  return {
    subject: substituteTemplate(subjectTemplate, values),
    customMessage: substituteTemplate(bodyTemplate, values),
  };
}
