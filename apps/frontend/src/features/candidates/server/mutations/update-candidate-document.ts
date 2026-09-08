import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/features/auth/server/auth-middleware";
import { candidatesService } from "../candidates-service";
import type { CandidateDocumentFormSchema } from "../../candidate-document-schemas";

export const updateCandidateDocument = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator(
    (data: {
      candidateId: string;
      documentId: string;
      data: CandidateDocumentFormSchema;
    }) => data,
  )
  .handler(async ({ data, context: { session } }) =>
    candidatesService.updateDocument(
      data.candidateId,
      data.documentId,
      data.data,
      session.user,
    ),
  );
