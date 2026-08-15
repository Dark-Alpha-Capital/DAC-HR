import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { weeklyCheckinService } from "../weekly-checkin-service";
import type { WeeklyCheckinFormSchema } from "../../schemas";

export const createWeeklyCheckin = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: WeeklyCheckinFormSchema) => data)
  .handler(async ({ data, context: { session } }) =>
    weeklyCheckinService.create(data, session.user),
  );
