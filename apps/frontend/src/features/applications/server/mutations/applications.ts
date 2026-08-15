import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import {
  applicationsService,
  type CreateApplicationInput,
  type UpdateApplicationInput,
} from "../applications-service";

export const createApplication = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: CreateApplicationInput) => data)
  .handler(async ({ data, context: { session } }) =>
    applicationsService.create(data, session.user),
  );

export const updateApplication = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: UpdateApplicationInput) => data)
  .handler(async ({ data, context: { session } }) =>
    applicationsService.update(data, session.user),
  );
