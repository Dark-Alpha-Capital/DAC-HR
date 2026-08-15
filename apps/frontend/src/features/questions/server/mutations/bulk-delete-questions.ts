import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { questionsService } from "../questions-service";

export const bulkDeleteQuestions = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string[]) => data)
  .handler(async ({ data: ids, context: { session } }) =>
    questionsService.bulkDelete(ids, session.user),
  );
