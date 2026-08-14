import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { createPosition as createPositionService } from "#/features/positions/positions-service";
import {
  positionFormSchema,
  type PositionFormSchema,
} from "#/features/positions/schemas";

export const createPosition = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: PositionFormSchema) => data)
  .handler(async ({ data, context: { session } }) => {
    if (session.user.role !== "admin") {
      return { error: "Only admins are allowed to create positions" };
    }

    const result = positionFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    return createPositionService(result.data, session.user);
  });
