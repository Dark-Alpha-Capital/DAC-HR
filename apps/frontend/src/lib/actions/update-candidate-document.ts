import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { db } from "@workspace/db/db";
import { candidateDocument } from "@workspace/db/schema";
import {
  CandidateDocumentFormSchema,
  candidateDocumentFormSchema,
} from "../schemas/candidate-document-form-schema";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updateCandidateDocument = createServerFn({ method: "POST" })
  .middleware([serverFnAuthGuard])
  .validator((data: [string, string, CandidateDocumentFormSchema]) => data)
  .handler(async ({ data: [documentId, candidateId, data], context: { session } }) => {});
