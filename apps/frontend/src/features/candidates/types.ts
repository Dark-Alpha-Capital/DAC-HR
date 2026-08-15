import type { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import type { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";

export type { Candidate, CandidateDocument } from "@workspace/db/schema";

export type CandidateWithApplications = NonNullable<
  Awaited<ReturnType<typeof getCandidateWithApplications>>
>;

export type CandidateDocuments = Awaited<
  ReturnType<typeof getDocumentsByCandidateId>
>;
