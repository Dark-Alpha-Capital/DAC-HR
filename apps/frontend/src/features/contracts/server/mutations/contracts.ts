import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { contractsService } from "../contracts-service";
import {
  contractTemplateCreateSchema,
  contractTemplateUpdateSchema,
  contractStatusUpdateSchema,
  sendContractForReviewSchema,
} from "../../schemas";

export const createContractTemplate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator(contractTemplateCreateSchema)
  .handler(async ({ data, context: { session } }) =>
    contractsService.createTemplate(data, session.user),
  );

export const updateContractTemplate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator(contractTemplateUpdateSchema)
  .handler(async ({ data, context: { session } }) =>
    contractsService.updateTemplate(data, session.user),
  );

export const deleteContractTemplate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: templateId, context: { session } }) =>
    contractsService.deleteTemplate(templateId, session.user),
  );

export const sendContractForReview = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator(sendContractForReviewSchema)
  .handler(async ({ data, context: { session } }) =>
    contractsService.sendForReview(data, session.user),
  );

export const updateContractStatusByApplication = createServerFn({
  method: "POST",
})
  .middleware([serverFnAuthGuard])
  .validator(contractStatusUpdateSchema)
  .handler(async ({ data, context: { session } }) =>
    contractsService.updateStatusByApplication(data, session.user),
  );
