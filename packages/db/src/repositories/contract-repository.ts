import { and, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db/db";
import type { ContractStatus, HireLevel } from "../enums";
import {
  contract,
  contractTemplate,
  application,
  candidate,
  position,
} from "../schema";

/**
 * Single home for all contract/template D1 queries (per the repo convention).
 * Feature services own business logic; these functions own SQL.
 */

// ---------------------------------------------------------------- templates

export const createContractTemplate = async (data: {
  name: string;
  positionId?: string | null;
  hireLevel?: HireLevel | null;
  bodyTemplate: string;
  isActive?: boolean;
  createdBy?: string | null;
}) => {
  const [row] = await db
    .insert(contractTemplate)
    .values({
      name: data.name,
      positionId: data.positionId ?? null,
      hireLevel: data.hireLevel ?? null,
      bodyTemplate: data.bodyTemplate,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy ?? null,
    })
    .returning();

  return row;
};

export const updateContractTemplate = async (
  id: string,
  patch: Partial<{
    name: string;
    positionId: string | null;
    hireLevel: HireLevel | null;
    bodyTemplate: string;
    isActive: boolean;
  }>,
) => {
  const [row] = await db
    .update(contractTemplate)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(contractTemplate.id, id))
    .returning();

  return row;
};

export const deleteContractTemplate = async (id: string) => {
  await db
    .delete(contractTemplate)
    .where(eq(contractTemplate.id, id));
};

export const listContractTemplates = async (options?: {
  positionId?: string | null;
  hireLevel?: HireLevel | null;
  activeOnly?: boolean;
}) => {
  const conditions = [];
  if (options?.positionId) {
    conditions.push(eq(contractTemplate.positionId, options.positionId));
  }
  if (options?.hireLevel) {
    conditions.push(eq(contractTemplate.hireLevel, options.hireLevel));
  }
  if (options?.activeOnly) {
    conditions.push(eq(contractTemplate.isActive, true));
  }

  return db
    .select({
      id: contractTemplate.id,
      name: contractTemplate.name,
      positionId: contractTemplate.positionId,
      positionName: position.name,
      hireLevel: contractTemplate.hireLevel,
      bodyTemplate: contractTemplate.bodyTemplate,
      isActive: contractTemplate.isActive,
      createdAt: contractTemplate.createdAt,
      updatedAt: contractTemplate.updatedAt,
    })
    .from(contractTemplate)
    .leftJoin(position, eq(contractTemplate.positionId, position.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(contractTemplate.createdAt);
};

export const getContractTemplateById = async (id: string) => {
  const [row] = await db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.id, id))
    .limit(1);

  return row ?? null;
};

// ----------------------------------------------------------------- contracts

export const createContract = async (data: {
  token: string;
  applicationId: string;
  candidateId: string;
  positionId: string;
  status?: ContractStatus;
}) => {
  const [row] = await db
    .insert(contract)
    .values({
      token: data.token,
      applicationId: data.applicationId,
      candidateId: data.candidateId,
      positionId: data.positionId,
      status: data.status ?? "draft",
    })
    .returning();

  return row;
};

export const getContractByApplicationId = async (applicationId: string) => {
  const [row] = await db
    .select()
    .from(contract)
    .where(eq(contract.applicationId, applicationId))
    .limit(1);

  return row ?? null;
};

export const getContractById = async (id: string) => {
  const [row] = await db
    .select()
    .from(contract)
    .where(eq(contract.id, id))
    .limit(1);

  return row ?? null;
};

/**
 * Load a contract by its public review token joined to the candidate and
 * position context needed to render the review page and send emails.
 */
export const getContractByToken = async (token: string) => {
  const [row] = await db
    .select({
      contract,
      candidate: {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
      },
      position: {
        id: position.id,
        name: position.name,
        hireLevel: position.hireLevel,
      },
      template: {
        id: contractTemplate.id,
        name: contractTemplate.name,
      },
    })
    .from(contract)
    .innerJoin(application, eq(contract.applicationId, application.id))
    .innerJoin(candidate, eq(contract.candidateId, candidate.id))
    .innerJoin(position, eq(contract.positionId, position.id))
    .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.id))
    .where(eq(contract.token, token))
    .limit(1);

  return row ?? null;
};

/** The application-level context (with candidate/position) for a contract id. */
export const getContractWithApplication = async (id: string) => {
  const [row] = await db
    .select({
      contract,
      candidate: {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
      },
      position: {
        id: position.id,
        name: position.name,
        hireLevel: position.hireLevel,
        department: position.department,
      },
      application: {
        id: application.id,
        status: application.status,
      },
      template: {
        id: contractTemplate.id,
        name: contractTemplate.name,
      },
    })
    .from(contract)
    .innerJoin(application, eq(contract.applicationId, application.id))
    .innerJoin(candidate, eq(contract.candidateId, candidate.id))
    .innerJoin(position, eq(contract.positionId, position.id))
    .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.id))
    .where(eq(contract.id, id))
    .limit(1);

  return row ?? null;
};

export const listContractsByApplicationId = async (applicationId: string) => {
  return db
    .select()
    .from(contract)
    .where(eq(contract.applicationId, applicationId))
    .orderBy(contract.createdAt);
};

export const listContractsByCandidateId = async (candidateId: string) => {
  return db
    .select()
    .from(contract)
    .where(eq(contract.candidateId, candidateId))
    .orderBy(contract.createdAt);
};

export const updateContract = async (
  id: string,
  patch: Partial<typeof contract.$inferInsert>,
) => {
  const [row] = await db
    .update(contract)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(contract.id, id))
    .returning();

  return row;
};

/**
 * Mark the first time a candidate opened the contract review link. Only fires
 * when the row exists and is still awaiting/reading (not yet sent for
 * signature, signed, or declined); keeps the earliest open time.
 */
export const markContractOpened = async (id: string) => {
  const [row] = await db
    .update(contract)
    .set({ openedAt: new Date() })
    .where(
      and(
        eq(contract.id, id),
        isNull(contract.openedAt),
        eq(contract.status, "sent_for_review"),
      ),
    )
    .returning();

  return row;
};

export const listContractsByPosition = async (positionId: string) => {
  const rows = await db
    .select({
      contract,
      candidate: {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
      },
    })
    .from(contract)
    .innerJoin(candidate, eq(contract.candidateId, candidate.id))
    .where(eq(contract.positionId, positionId))
    .orderBy(contract.createdAt);

  return rows.map((row) => ({ ...row.contract, candidate: row.candidate }));
};

/**
 * Every application for a position with the candidate identity and any
 * existing contract — the aggregate "who can receive a contract" list for the
 * send-for-review screen.
 */
export const getApplicationsForContractSending = async (positionId: string) => {  return db
    .select({
      application: {
        id: application.id,
        status: application.status,
        updatedAt: application.updatedAt,
      },
      candidate: {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
      },
      contract: {
        id: contract.id,
        status: contract.status,
        version: contract.version,
        sentAt: contract.sentAt,
        openedAt: contract.openedAt,
        receiptAffirmedAt: contract.receiptAffirmedAt,
      },
    })
    .from(application)
    .innerJoin(candidate, eq(application.candidateId, candidate.id))
    .leftJoin(contract, eq(contract.applicationId, application.id))
    .where(eq(application.positionId, positionId))
    .orderBy(candidate.firstName, candidate.lastName);
};

/**
 * The candidate/position context needed to render a contract for an
 * application (used by the send-for-review flow).
 */
export const getApplicationContractContext = async (applicationId: string) => {
  const [row] = await db
    .select({
      application: {
        id: application.id,
        status: application.status,
      },
      candidate: {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
      },
      position: {
        id: position.id,
        name: position.name,
        hireLevel: position.hireLevel,
        department: position.department,
      },
    })
    .from(application)
    .innerJoin(candidate, eq(application.candidateId, candidate.id))
    .innerJoin(position, eq(application.positionId, position.id))
    .where(eq(application.id, applicationId))
    .limit(1);

  return row ?? null;
};
