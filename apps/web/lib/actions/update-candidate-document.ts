import { defineAction, defineArgsAction } from "./create-action";
import { db } from "@workspace/db/db";
import { candidateDocument } from "@workspace/db/schema";
import {
  CandidateDocumentFormSchema,
  candidateDocumentFormSchema,
} from "../schemas/candidate-document-form-schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { eq } from "@workspace/db";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const updateCandidateDocument = defineArgsAction(async (
  documentId: string,
  candidateId: string,
  data: CandidateDocumentFormSchema,
) => {});
