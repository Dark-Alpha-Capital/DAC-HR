import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { questionsService } from "../questions-service";
import type { QuestionEditFormSchema } from "../../schemas";

type PatchQuestionInputData = {
  questionId: string;
  formData: QuestionEditFormSchema;
};

export const patchQuestion = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: PatchQuestionInputData) => data)
  .handler(async ({ data, context: { session } }) => {
    const { questionId, formData } = data;
    return questionsService.patch(
      {
        questionId,
        questionText: formData.questionText,
        questionType: formData.questionType,
        options:
          formData.questionType === "mcq" ? formData.options : undefined,
      },
      session.user,
    );
  });
