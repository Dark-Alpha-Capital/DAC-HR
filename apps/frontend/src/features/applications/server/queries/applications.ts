import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { applicationsService } from "../applications-service";

type ApplicationsIndexInput = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  page?: number;
};

export const loadApplicationsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: ApplicationsIndexInput) => data)
  .handler(async ({ data: deps }) => applicationsService.list(deps));

export const loadApplicationDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: applicationId }) =>
    applicationsService.getDetail(applicationId),
  );
