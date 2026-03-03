import { cacheLife, cacheTag } from "next/cache";
import {
  getCandidateWithApplications,
  getDocumentsByCandidateId,
  getPositions,
  getCandidatesWithPositionsFiltered,
  getApplicationsFiltered,
} from "@workspace/db/queries";

export async function getCachedCandidate(uid: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");
  cacheTag(`candidate-applications-${uid}`);

  return getCandidateWithApplications(uid);
}

export async function getCachedDocuments(uid: string) {
  "use cache";
  cacheLife("hr-data");
  cacheTag(`candidate-documents-${uid}`);

  return getDocumentsByCandidateId(uid);
}

export async function getCachedPositions() {
  "use cache";
  cacheLife("hr-metadata");
  cacheTag("positions");

  return getPositions();
}

export async function getCachedCandidatesWithPositionsFiltered(
  nameSearch: string | undefined,
  emailSearch: string | undefined,
  positionIds: string[] | undefined,
  page: number,
  limit: number,
) {
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");

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
  "use cache";
  cacheLife("hr-data");
  cacheTag("candidates");

  return getApplicationsFiltered(
    nameSearch,
    emailSearch,
    positionIds,
    statuses,
    page,
    limit,
  );
}

