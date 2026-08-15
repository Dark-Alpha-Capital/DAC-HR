import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { createQuestion as createQuestionService } from "#/features/questions/questions-service";
import {
  questionFormSchema,
  type QuestionFormSchema,
} from "#/features/questions/schemas";

export const createQuestion = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: QuestionFormSchema) => data)
  .handler(async ({ data, context: { session } }) => {
    const result = questionFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    return createQuestionService(result.data, session.user);
  });
