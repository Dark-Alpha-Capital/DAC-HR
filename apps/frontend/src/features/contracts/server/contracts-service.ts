import { randomUUID } from "crypto";
import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import { application } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  createContract,
  createContractTemplate,
  deleteContractTemplate,
  getApplicationContractContext,
  getApplicationsForContractSending,
  getContractByApplicationId,
  getContractByToken,
  getContractTemplateById,
  getContractWithApplication,
  listContractTemplates,
  markContractOpened,
  updateContract,
  updateContractTemplate,
} from "@workspace/db/repositories/contract-repository";
import type { ContractStatus } from "@workspace/db/enums";
import { enqueueEmail } from "#/lib/queues/enqueue";
import {
  getPublicBaseUrl,
  getRecruitingEmail,
} from "#/lib/server/email-sender";
import type {
  ContractStatusUpdateInput,
  ContractTemplateCreateInput,
  ContractTemplateUpdateInput,
  SendContractForReviewInput,
} from "../schemas";
import { formatOfferDate, renderContractTemplate } from "../helpers";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export const contractsService = {
  // ---------------------------------------------------------- template admin

  async listTemplates() {
    return listContractTemplates({ activeOnly: false });
  },

  async createTemplate(input: ContractTemplateCreateInput, actor: Actor) {
    const template = await createContractTemplate({
      name: input.name,
      positionId: input.positionId ?? null,
      hireLevel: input.hireLevel ?? null,
      bodyTemplate: input.bodyTemplate,
      isActive: input.isActive ?? true,
      createdBy: actor.id,
    });

    insertAuditLog({
      userId: actor.id,
      action: "create_contract_template",
      entityType: "contract_template",
      entityId: template.id,
      details: {
        template: { id: template.id, name: template.name },
        createdBy: { id: actor.id, email: actor.email, name: actor.name },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return template;
  },

  async updateTemplate(input: ContractTemplateUpdateInput, actor: Actor) {
    const id = input.id;
    if (!id) {
      return { error: "Template id is required" };
    }
    const existing = await getContractTemplateById(id);
    if (!existing) {
      return { error: "Template not found" };
    }

    const template = await updateContractTemplate(id, {
      name: input.name ?? existing.name,
      positionId:
        input.positionId !== undefined
          ? (input.positionId ?? null)
          : existing.positionId,
      hireLevel:
        input.hireLevel !== undefined
          ? (input.hireLevel ?? null)
          : existing.hireLevel,
      bodyTemplate: input.bodyTemplate ?? existing.bodyTemplate,
      isActive: input.isActive ?? existing.isActive,
    });

    insertAuditLog({
      userId: actor.id,
      action: "update_contract_template",
      entityType: "contract_template",
      entityId: template.id,
      details: {
        template: { id: template.id, name: template.name },
        updatedBy: { id: actor.id, email: actor.email, name: actor.name },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { template };
  },

  async deleteTemplate(id: string, actor: Actor) {
    await deleteContractTemplate(id);
    insertAuditLog({
      userId: actor.id,
      action: "delete_contract_template",
      entityType: "contract_template",
      entityId: id,
      details: { template: { id } },
    }).catch((error) => console.error("Audit log error:", error));
    return { success: true };
  },

  // ------------------------------------------------------------ send / read

  /**
   * Send a contract for a candidate's application for review. Resolves the
   * template (explicit → position-specific → hire-level), merges the body,
   * snapshots it on the contract, emails the candidate a review link, and
   * moves the application to the contract/offer pipeline stage.
   */
  async sendForReview(input: SendContractForReviewInput, actor: Actor) {
    const context = await getApplicationContractContext(input.applicationId);
    if (!context) {
      return { error: "Application not found" };
    }

    const existing = await getContractByApplicationId(input.applicationId);

    // Light idempotency guard: an identical send moments ago must not spam the
    // candidate with a second email + version.
    if (
      existing?.status === "sent_for_review" &&
      !existing.openedAt &&
      existing.sentAt &&
      Date.now() - existing.sentAt.getTime() < 5 * 60 * 1000
    ) {
      return { ok: true, contract: existing, emailEnqueued: false };
    }

    const template = await this.resolveTemplate(
      input.templateId ?? null,
      context.position.id,
      context.position.hireLevel,
    );
    if (!template) {
      return {
        error:
          "No contract template exists for this position or hire level. " +
          "Create one under Admin → Contract Templates first.",
      };
    }

    const variables = input.variables ?? {};
    const merged = this.renderMergedBody(template.bodyTemplate, context, variables);

    const expiresAt = new Date(
      Date.now() + (input.expiryDays ?? 14) * 24 * 60 * 60 * 1000,
    );
    const now = new Date();
    const version = (existing?.version ?? 0) + 1;

    let contractRow =
      existing ??
      (await createContract({
        token: randomUUID(),
        applicationId: input.applicationId,
        candidateId: context.candidate.id,
        positionId: context.position.id,
        status: "draft",
      }));

    contractRow = await updateContract(contractRow.id, {
      templateId: template.id,
      // Snapshot marker: the template's last update time identifies the
      // content the body was rendered from.
      templateVersion: Math.floor(template.updatedAt.getTime() / 1000),
      version,
      status: "sent_for_review",
      subject: input.subject ?? null,
      customMessage: input.customMessage ?? null,
      variables,
      bodyText: merged,
      expiresAt,
      sentAt: now,
      openedAt: null,
      receiptAffirmedAt: null,
      declinedAt: null,
    });

    await this.ensureApplicationStage(input.applicationId, "contract_offer");

    let emailEnqueued = false;
    if (context.candidate.email) {
      const origin = getPublicBaseUrl();
      const reviewUrl = `${origin}/contract/${contractRow.token}/review`;
      emailEnqueued = await this.enqueueReviewEmail({
        to: context.candidate.email,
        candidateName: `${context.candidate.firstName} ${context.candidate.lastName}`.trim(),
        positionName: context.position.name,
        reviewUrl,
        subject: input.subject ?? null,
        customMessage: input.customMessage ?? null,
        dedupeKey: `contract-review:${contractRow.id}:${context.candidate.email}:v${version}`,
      });
    }

    insertAuditLog({
      userId: actor.id,
      action: "send_contract_for_review",
      entityType: "contract",
      entityId: contractRow.id,
      details: {
        contract: {
          id: contractRow.id,
          applicationId: input.applicationId,
          candidateId: context.candidate.id,
          positionId: context.position.id,
          version,
          templateId: template.id,
        },
        createdBy: { id: actor.id, email: actor.email, name: actor.name },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { ok: true, contract: contractRow, emailEnqueued };
  },

  async getForApplication(applicationId: string) {
    const row = await getContractByApplicationId(applicationId);
    if (!row) {
      return null;
    }
    return this.getDetail(row.id);
  },

  /** Candidates (with any existing contract) that can receive a contract. */
  async listSendTargets(positionId: string) {
    const rows = await getApplicationsForContractSending(positionId);
    return rows.map((row) => ({
      applicationId: row.application.id,
      applicationStatus: row.application.status,
      candidateId: row.candidate.id,
      candidateName:
        `${row.candidate.firstName} ${row.candidate.lastName}`.trim(),
      candidateEmail: row.candidate.email,
      contract: row.contract
        ? {
            id: row.contract.id,
            status: row.contract.status,
            version: row.contract.version,
            sentAt: row.contract.sentAt,
            openedAt: row.contract.openedAt,
            receiptAffirmedAt: row.contract.receiptAffirmedAt,
          }
        : null,
    }));
  },

  async getDetail(id: string) {
    const row = await getContractWithApplication(id);
    if (!row) {
      return null;
    }
    return {
      ...row.contract,
      candidate: row.candidate,
      position: row.position,
      templateName: row.template?.name ?? null,
      applicationStatus: row.application.status,
    };
  },

  // ------------------------------------------------- candidate (token-scoped)

  /** Public read for the candidate review page. No admin/auth required. */
  async getPublicByToken(token: string) {
    const row = await getContractByToken(token);
    if (!row) {
      return null;
    }

    // Record the first open (only meaningful while awaiting review).
    markContractOpened(row.contract.id).catch((error) =>
      console.error("markContractOpened error:", error),
    );

    return {
      token: row.contract.token,
      status: row.contract.status,
      version: row.contract.version,
      candidateFirstName: row.candidate.firstName,
      positionName: row.position.name,
      bodyText: row.contract.bodyText ?? "",
      subject: row.contract.subject,
      customMessage: row.contract.customMessage,
      expiresAt: row.contract.expiresAt,
      sentAt: row.contract.sentAt,
      receiptAffirmedAt: row.contract.receiptAffirmedAt,
    };
  },

  async affirmReceipt(token: string) {
    const row = await getContractByToken(token);
    if (!row) {
      return { error: "Contract not found" };
    }
    const allowed: ContractStatus[] = [
      "sent_for_review",
      "receipt_affirmed",
      "negotiation",
    ];
    if (!allowed.includes(row.contract.status)) {
      return {
        error: `This contract is no longer awaiting review (status: ${row.contract.status}).`,
      };
    }

    const contractRow = await updateContract(row.contract.id, {
      status: "receipt_affirmed",
      receiptAffirmedAt: new Date(),
    });

    // Auto-advance the pipeline: acknowledged receipt → offer/agreement stage.
    await this.ensureApplicationStage(row.contract.applicationId, "offer_agreement");

    return { ok: true, contract: contractRow };
  },

  async requestNegotiation(token: string) {
    const row = await getContractByToken(token);
    if (!row) {
      return { error: "Contract not found" };
    }
    const allowed: ContractStatus[] = [
      "sent_for_review",
      "receipt_affirmed",
      "negotiation",
    ];
    if (!allowed.includes(row.contract.status)) {
      return {
        error: `This contract can no longer be negotiated (status: ${row.contract.status}).`,
      };
    }

    const contractRow = await updateContract(row.contract.id, {
      status: "negotiation",
    });

    await this.ensureApplicationStage(row.contract.applicationId, "offer_agreement");

    // The candidate now wants to talk — someone at HR must act. Fire an
    // internal notice so the request is never stranded as a silent status.
    await this.notifyNegotiationRequested(row);

    return { ok: true, contract: contractRow };
  },

  async declineContract(token: string) {
    const row = await getContractByToken(token);
    if (!row) {
      return { error: "Contract not found" };
    }
    const allowed: ContractStatus[] = [
      "sent_for_review",
      "receipt_affirmed",
      "negotiation",
      "negotiated",
    ];
    if (!allowed.includes(row.contract.status)) {
      return {
        error: `This contract can no longer be declined (status: ${row.contract.status}).`,
      };
    }

    const contractRow = await updateContract(row.contract.id, {
      status: "declined",
      declinedAt: new Date(),
    });

    return { ok: true, contract: contractRow };
  },

  /**
   * Alert the recruiting inbox that a candidate asked to discuss terms. The
   * request currently only flips the contract status — without this notice it
   * would sit silently until someone opened the Contracts screen.
   */
  async notifyNegotiationRequested(
    row: Awaited<ReturnType<typeof getContractByToken>>,
  ) {
    if (!row) {
      return;
    }
    try {
      const origin = getPublicBaseUrl();
      const candidateName =
        `${row.candidate.firstName} ${row.candidate.lastName}`.trim();
      const reviewUrl = `${origin}/contract/${row.contract.token}/review`;
      const inboxUrl = `${origin}/contracts`;

      const subject = `Negotiation requested — ${candidateName} (${row.position.name})`;

      const html = [
        `<div style="font-family: sans-serif; color: #18181b; line-height: 1.6">`,
        `<p><strong>${candidateName}</strong> has asked to discuss the terms of their contract for <strong>${row.position.name}</strong>.</p>`,
        `<p>Open the contract in the app to review their current version, revise the offer, and send an updated contract for review:</p>`,
        `<p><a href="${inboxUrl}" style="background:#18181b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open Contracts</a></p>`,
        `<p>Candidate review page: <a href="${reviewUrl}">${reviewUrl}</a></p>`,
        `<p style="color:#71717a;font-size:13px">No action is taken automatically — terms are negotiated by a person (email agent negotiation arrives later).</p>`,
        `</div>`,
      ].join("");

      await enqueueEmail(db, [
        {
          jobName: "internal-notice",
          jobId: `internal-notice-negotiation-${row.contract.id}`,
          dedupeKey: `internal-notice:negotiation:${row.contract.id}`,
          data: {
            type: "internal-notice",
            to: getRecruitingEmail(),
            subject,
            html,
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to enqueue negotiation notice:", error);
    }
  },

  /** Manually move a contract to a new status (HR actions). */
  async updateStatusByApplication(
    input: ContractStatusUpdateInput,
    actor: Actor,
  ) {
    const existing = await getContractByApplicationId(input.applicationId);
    if (!existing) {
      return { error: "No contract exists for this application yet" };
    }

    const contractRow =
      input.status === "declined"
        ? await updateContract(existing.id, {
            status: input.status,
            declinedAt: new Date(),
          })
        : await updateContract(existing.id, { status: input.status });

    if (input.status === "signed") {
      await this.ensureApplicationStage(input.applicationId, "onboarding");
    }

    insertAuditLog({
      userId: actor.id,
      action: "update_contract_status",
      entityType: "contract",
      entityId: existing.id,
      details: {
        from: existing.status,
        to: input.status,
        updatedBy: { id: actor.id, email: actor.email, name: actor.name },
      },
    }).catch((error) => console.error("Audit log error:", error));

    return { ok: true, contract: contractRow };
  },

  // ------------------------------------------------------------- internals

  async resolveTemplate(
    templateId: string | null,
    positionId: string,
    hireLevel: string | null,
  ) {
    if (templateId) {
      const template = await getContractTemplateById(templateId);
      return template ?? null;
    }

    const all = await listContractTemplates({ activeOnly: true });
    const positionMatch = all.find((t) => t.positionId === positionId);
    if (positionMatch) {
      return positionMatch;
    }
    if (hireLevel) {
      return (
        all.find((t) => t.hireLevel === hireLevel && !t.positionId) ?? null
      );
    }
    return null;
  },

  renderMergedBody(
    bodyTemplate: string,
    context: Awaited<ReturnType<typeof getApplicationContractContext>>,
    variables: Record<string, string | number | boolean | null | undefined>,
  ) {
    if (!context) {
      throw new Error("Missing application context for contract render");
    }
    const department = Array.isArray(context.position.department)
      ? context.position.department.join(", ")
      : "";

    const values = {
      candidateName: `${context.candidate.firstName} ${context.candidate.lastName}`.trim(),
      candidateFirstName: context.candidate.firstName,
      candidateLastName: context.candidate.lastName,
      candidateEmail: context.candidate.email,
      positionName: context.position.name,
      hireLevel: context.position.hireLevel ?? "",
      department,
      offerDate: formatOfferDate(),
      ...variables,
    };

    return renderContractTemplate(bodyTemplate, values);
  },

  async ensureApplicationStage(applicationId: string, stage: ApplicationStage) {
    const stages = {
      contract_offer: ["ai_screening", "first_round", "technical_round"],
      offer_agreement: [
        "contract_offer",
        "offer_agreement",
        "ai_screening",
        "first_round",
        "technical_round",
      ],
      onboarding: ["onboarding", "offer_agreement", "contract_offer"],
    } satisfies Record<ApplicationStage, readonly string[]>;

    const [row] = await db
      .select({ status: application.status })
      .from(application)
      .where(eq(application.id, applicationId))
      .limit(1);

    if (!row) {
      return;
    }
    if (!stages[stage].includes(row.status)) {
      return;
    }
    if (row.status === stage) {
      return;
    }
    await db
      .update(application)
      .set({ status: stage })
      .where(eq(application.id, applicationId));
  },

  async enqueueReviewEmail(data: {
    to: string;
    candidateName: string;
    positionName: string;
    reviewUrl: string;
    subject: string | null;
    customMessage: string | null;
    dedupeKey: string;
  }): Promise<boolean> {
    try {
      const payload: ContractReviewQueuePayload = {
        type: "contract-review",
        to: data.to,
        candidateName: data.candidateName,
        positionName: data.positionName,
        reviewUrl: data.reviewUrl,
      };
      if (data.subject) {
        payload.subject = data.subject;
      }
      if (data.customMessage) {
        payload.customMessage = data.customMessage;
      }
      await enqueueEmail(db, [
        {
          jobName: "contract-review",
          jobId: `contract-review-${data.dedupeKey}`,
          dedupeKey: data.dedupeKey,
          data: payload,
        },
      ]);
      return true;
    } catch (error) {
      console.error("Failed to enqueue contract review email:", error);
      return false;
    }
  },
};

type ApplicationStage = "contract_offer" | "offer_agreement" | "onboarding";

type ContractReviewQueuePayload = {
  type: "contract-review";
  to: string;
  candidateName: string;
  positionName: string;
  reviewUrl: string;
  subject?: string;
  customMessage?: string;
};
