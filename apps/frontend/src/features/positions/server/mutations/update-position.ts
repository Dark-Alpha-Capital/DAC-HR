import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { updatePosition as updatePositionService } from "#/features/positions/positions-service";
import {
  positionFormSchema,
  type PositionFormSchema,
} from "#/features/positions/schemas";

export const updatePosition = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, PositionFormSchema]) => data)
  .handler(async ({ data: [positionId, data], context: { session } }) => {
    if (session.user.role !== "admin") {
      return { error: "Only admins are allowed to update positions" };
    }

    const result = positionFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    return updatePositionService(positionId, result.data, session.user);
  });
