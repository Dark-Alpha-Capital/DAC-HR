import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import {
  candidatesService,
  type UpdateCandidateInput,
} from "../candidates-service";
import type { CandidateFormSchema } from "../../schemas";

export const updateCandidate = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, CandidateFormSchema]) => data)
  .handler(async ({ data: [candidateId, data], context: { session } }) => {
    const input: UpdateCandidateInput = {
      candidateId,
      ...data,
    };
    return candidatesService.update(input, session.user);
  });
