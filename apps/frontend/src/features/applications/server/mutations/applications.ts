import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  createApplication as createApplicationService,
  updateApplication as updateApplicationService,
  type CreateApplicationInput,
  type UpdateApplicationInput,
} from "#/features/applications/applications-service";

export const createApplication = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateApplicationInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return createApplicationService(data, session.user);
  });

export const updateApplication = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateApplicationInput) => data)
  .handler(async ({ data, context: { session } }) => {
    return updateApplicationService(data, session.user);
  });
