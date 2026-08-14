import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  createRound as createRoundService,
  type RoundFormData,
} from "#/features/rounds/rounds-service";
import { roundFormSchema } from "#/features/rounds/schemas";

export const createRound = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: RoundFormData) => data)
  .handler(async ({ data, context: { session } }) => {
    if (session.user.role !== "admin") {
      return { error: "Only admins are allowed to create rounds" };
    }

    const result = roundFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    return createRoundService(result.data, session.user);
  });
