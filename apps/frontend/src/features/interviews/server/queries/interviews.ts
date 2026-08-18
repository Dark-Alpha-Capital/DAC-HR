import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { interviewsService } from "../interviews-service";

export const loadInterviewById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id }) => interviewsService.getById(id));

export const loadInterviewBundleById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: bundleId }) =>
    interviewsService.getBundleById(bundleId),
  );

export const loadBundleAiAnalyses = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: bundleId }) =>
    interviewsService.getBundleAiAnalyses(bundleId),
  );

export const loadInterviewAnalyses = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: interviewId }) =>
    interviewsService.getInterviewAnalyses(interviewId),
  );
