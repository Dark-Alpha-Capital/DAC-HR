import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { deleteQuestion as deleteQuestionService } from "#/features/questions/questions-service";

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    return deleteQuestionService(id, session.user);
  });
