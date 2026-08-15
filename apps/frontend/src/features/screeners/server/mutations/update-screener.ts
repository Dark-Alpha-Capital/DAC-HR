import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { screenersService } from "../screeners-service";
import { screenerEditSchema } from "../../schemas";

export const updateScreenerAction = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator(
    screenerEditSchema.extend({ id: z.string().min(1) }),
  )
  .handler(async ({ data, context: { session } }) => {
    const { id, ...formData } = data;
    return screenersService.update(id, session.user.id, formData);
  });
