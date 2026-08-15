import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { questionsService } from "../questions-service";
import type { QuestionFormSchema } from "../../schemas";

export const createQuestion = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: QuestionFormSchema) => data)
  .handler(async ({ data, context: { session } }) =>
    questionsService.create(data, session.user),
  );
