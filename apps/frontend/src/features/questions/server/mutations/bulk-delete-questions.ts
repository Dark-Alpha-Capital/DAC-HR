import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { bulkDeleteQuestions as bulkDeleteQuestionsService } from "#/features/questions/questions-service";

export const bulkDeleteQuestions = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string[]) => data)
  .handler(async ({ data: ids, context: { session } }) => {
    return bulkDeleteQuestionsService(ids, session.user);
  });
