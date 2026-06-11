import { defineAction, defineArgsAction } from "./create-action";
import { db } from "@workspace/db/db";
import { candidateDocument } from "@workspace/db/schema";
import {
  CandidateDocumentFormSchema,
  candidateDocumentFormSchema,
} from "../schemas/candidate-document-form-schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const createCandidateDocument = defineArgsAction(async (
  candidateId: string,
  data: CandidateDocumentFormSchema,
) => {});
