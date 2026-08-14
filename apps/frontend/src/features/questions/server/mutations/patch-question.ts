import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import { patchQuestion as patchQuestionService, type PatchQuestionInput } from "#/features/questions/questions-service";
import {
  questionEditFormSchema,
  type QuestionEditFormSchema,
} from "#/features/questions/schemas";

export interface PatchQuestionInputData {
  questionId: string;
  formData: QuestionEditFormSchema;
}

export const patchQuestion = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: PatchQuestionInputData) => data)
  .handler(async ({ data, context: { session } }) => {
    const { questionId, formData } = data;

    const result = questionEditFormSchema.safeParse(formData);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const parsed = result.data;

    return patchQuestionService(
      {
        questionId,
        questionText: parsed.questionText,
        questionType: parsed.questionType,
        options:
          parsed.questionType === "mcq" ? parsed.options : undefined,
      } as PatchQuestionInput,
      session.user,
    );
  });
