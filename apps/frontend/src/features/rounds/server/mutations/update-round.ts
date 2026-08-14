import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  updateRound as updateRoundService,
  type RoundEditData,
} from "#/features/rounds/rounds-service";
import { roundEditFormSchema } from "#/features/rounds/schemas";

export const updateRound = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator(
    (data: [string, RoundEditData]) => data,
  )
  .handler(async ({ data: [roundId, data], context: { session } }) => {
    if (session.user.role !== "admin") {
      return { error: "Only admins are allowed to update rounds" };
    }

    // Use edit schema for validation since we only update name and description
    const result = roundEditFormSchema.safeParse({
      name: data.name,
      description: data.description,
    });
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    return updateRoundService(roundId, result.data, session.user);
  });
