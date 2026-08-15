import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { weeklyCheckinService } from "../weekly-checkin-service";

export const loadWeeklyCheckinForm = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async ({ context: { session } }) =>
    weeklyCheckinService.getForm(session.user),
  );

export const loadWeeklyCheckinRecords = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: { page?: number }) => data)
  .handler(async ({ data: deps, context: { session } }) =>
    weeklyCheckinService.getRecords(session.user, deps.page),
  );
