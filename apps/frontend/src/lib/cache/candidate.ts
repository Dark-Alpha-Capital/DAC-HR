import { getCandidateWithApplications } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import {
  getPositions,
  getCandidatesWithPositionsFiltered,
  getApplicationsFiltered,
} from "@workspace/db/queries";

export async function getCachedCandidate(uid: string) {
  return getCandidateWithApplications(uid);
}

export async function getCachedDocuments(uid: string) {
  return getDocumentsByCandidateId(uid);
}

export async function getCachedPositions() {
  return getPositions();
}

export async function getCachedCandidatesWithPositionsFiltered(
  nameSearch: string | undefined,
  emailSearch: string | undefined,
  positionIds: string[] | undefined,
  page: number,
  limit: number,
) {
  return getCandidatesWithPositionsFiltered(
    nameSearch,
    emailSearch,
    positionIds,
    page,
    limit,
  );
}

export async function getCachedApplicationsFiltered(
  nameSearch: string | undefined,
  emailSearch: string | undefined,
  positionIds: string[] | undefined,
  statuses: string[] | undefined,
  page: number,
  limit: number,
) {
  return getApplicationsFiltered(
    nameSearch,
    emailSearch,
    positionIds,
    statuses,
    page,
    limit,
  );
}
