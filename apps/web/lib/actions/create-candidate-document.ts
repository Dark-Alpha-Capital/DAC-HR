import { db } from "@workspace/db";
import { candidateDocument } from "@workspace/db/schema";
import {
  CandidateDocumentFormSchema,
  candidateDocumentFormSchema,
} from "../schemas/candidate-document-form-schema";
import { getSession } from "@/lib/middleware/auth-guard";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";

export const createCandidateDocument = async (
  candidateId: string,
  data: CandidateDocumentFormSchema,
) => {};
