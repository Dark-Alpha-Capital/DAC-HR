import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { createWeeklyCheckin as createWeeklyCheckinService } from "#/features/weekly-checkin/weekly-checkin-service";
import type { WeeklyCheckinFormSchema } from "#/features/weekly-checkin/schemas";

export const createWeeklyCheckin = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: WeeklyCheckinFormSchema) => data)
  .handler(async ({ data, context: { session } }) => {
    return createWeeklyCheckinService(data, session.user);
  });
