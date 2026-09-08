import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { contractsService } from "../contracts-service";

export const loadContractTemplates = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async () => contractsService.listTemplates());

export const loadContractSendTargets = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: positionId }) =>
    contractsService.listSendTargets(positionId),
  );

export const loadContractForApplication = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: applicationId }) =>
    contractsService.getForApplication(applicationId),
  );

export const loadContractDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => contractsService.getDetail(id));
