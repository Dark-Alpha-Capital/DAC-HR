import { z } from "zod";
import { contractStatuses, hireLevels } from "#/lib/enums";

export const contractMergeVariableSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .nullable()
  .optional();

export const contractTemplateCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  positionId: z.string().optional().nullable(),
  hireLevel: z.enum(hireLevels).optional().nullable(),
  bodyTemplate: z.string().trim().min(1, "Contract body is required"),
  isActive: z.boolean().optional().default(true),
});

export const contractTemplateUpdateSchema = contractTemplateCreateSchema
  .extend({ id: z.string().min(1) })
  .partial();

export const sendContractForReviewSchema = z.object({
  applicationId: z.string().min(1),
  /** Explicit template id; otherwise resolved position → hire-level. */
  templateId: z.string().optional().nullable(),
  /** Free-form offer values (e.g. { compensation, startDate, location }). */
  variables: z.record(z.string(), contractMergeVariableSchema).optional(),
  subject: z.string().trim().optional().nullable(),
  customMessage: z.string().trim().optional().nullable(),
  /** Days the review link stays valid. */
  expiryDays: z.number().int().min(1).max(90).optional().default(14),
});

export const contractStatusesSchema = z.enum(contractStatuses);

export const contractStatusUpdateSchema = z.object({
  applicationId: z.string().min(1),
  status: contractStatusesSchema,
});

export type ContractTemplateCreateInput = z.infer<
  typeof contractTemplateCreateSchema
>;
export type ContractTemplateUpdateInput = z.infer<
  typeof contractTemplateUpdateSchema
>;
export type SendContractForReviewInput = z.infer<
  typeof sendContractForReviewSchema
>;
export type ContractStatusUpdateInput = z.infer<
  typeof contractStatusUpdateSchema
>;
