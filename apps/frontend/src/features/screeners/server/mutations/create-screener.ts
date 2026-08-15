import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { screenersService } from "../screeners-service";
import { screenerFormSchema } from "../../schemas";

export const createScreenerAction = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator(screenerFormSchema)
  .handler(async ({ data, context: { session } }) =>
    screenersService.create(session.user.id, data),
  );
