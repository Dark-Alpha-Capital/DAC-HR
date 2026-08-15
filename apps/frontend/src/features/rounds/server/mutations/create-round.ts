import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { roundsService } from "../rounds-service";
import type { RoundFormSchema } from "../../schemas";

export const createRound = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: RoundFormSchema) => data)
  .handler(async ({ data, context: { session } }) =>
    roundsService.create(data, session.user),
  );
