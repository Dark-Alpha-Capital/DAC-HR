import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  updateCandidate as updateCandidateService,
  type UpdateCandidateInput,
} from "#/features/candidates/candidates-service";
import {
  candidateFormSchema,
  type CandidateFormSchema,
} from "#/features/candidates/schemas";

export const updateCandidate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, CandidateFormSchema]) => data)
  .handler(async ({ data: [candidateId, data], context: { session } }) => {
    const result = candidateFormSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.flatten().fieldErrors };
    }

    const input: UpdateCandidateInput = {
      candidateId,
      ...result.data,
    };

    return updateCandidateService(input, session.user);
  });
