import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  getApplicationsFiltered,
  getCandidateById,
  getCandidateAiScreenings,
  getUsers,
} from "@workspace/db/repositories/candidate-repository";
import { getPositions } from "@workspace/db/modules/positions";
import { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import { getSessionsByApplicationId } from "@workspace/db/repositories/interview-session-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import type { CandidateAiScreeningData } from "#/features/applications/schemas";

/**
 * Full shape returned by getApplicationWithInterviews — the single canonical
 * application detail type. Components that need a narrower view pick from it.
 */
export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof getApplicationWithInterviews>>
>;

export type ApplicationProgress = Pick<
  ApplicationDetail,
  "id" | "candidateId" | "positionId" | "rounds"
>;

export type ApplicationRounds = ApplicationDetail["rounds"];

type ApplicationsIndexInput = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  page?: number;
};

export const loadApplicationsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: ApplicationsIndexInput) => data)
  .handler(async ({ data: deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, applicationsResult] = await Promise.all([
      getPositions(),
      getApplicationsFiltered(
        deps.name,
        deps.email,
        deps.position,
        deps.status,
        currentPage,
        limit,
      ),
    ]);

    const { applications, total } = applicationsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      applications,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.name || deps.email || deps.position?.length || deps.status?.length,
      ),
    };
  });

export type ApplicationDetailData = {
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  sessions: Awaited<ReturnType<typeof getSessionsByApplicationId>>;
  aiScreenings: Array<
    Omit<
      Awaited<ReturnType<typeof getCandidateAiScreenings>>[number],
      "structuredData"
    > & { structuredData: CandidateAiScreeningData | null }
  >;
  documents: Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
  users: Awaited<ReturnType<typeof getUsers>>;
};

export const loadApplicationDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: applicationId }): Promise<ApplicationDetailData> => {
    const [application, users] = await Promise.all([
      getApplicationWithInterviews(applicationId),
      getUsers(),
    ]);

    if (!application) {
      return {
        application: null,
        candidate: null,
        sessions: [],
        aiScreenings: [],
        documents: [],
        users,
      };
    }

    const [candidate, sessions, aiScreenings, documents] = await Promise.all([
      getCandidateById(application.candidateId),
      getSessionsByApplicationId(applicationId).catch(() => []),
      getCandidateAiScreenings(application.candidateId).catch(() => []),
      getDocumentsByCandidateId(application.candidateId).catch(() => []),
    ]);

    return {
      application,
      candidate,
      sessions,
      aiScreenings: aiScreenings.map((screening) => ({
        ...screening,
        structuredData:
          screening.structuredData as CandidateAiScreeningData | null,
      })),
      documents,
      users,
    };
  });

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import {
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "#/lib/parse-search";

export function parseApplicationsSearch(search: Record<string, unknown>) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    position: toStringArray(search.position as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

export type ApplicationsIndexSearch = ReturnType<
  typeof parseApplicationsSearch
>;
export type ApplicationsIndexData = Awaited<
  ReturnType<typeof loadApplicationsIndex>
>;

export function applicationsIndexQueryOptions(deps: ApplicationsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.applications.list(deps),
    queryFn: async (): Promise<ApplicationsIndexData> =>
      loadApplicationsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}

export function applicationDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.applications.detail(id),
    queryFn: async (): Promise<ApplicationDetailData> =>
      (await loadApplicationDetail({ data: id })) as ApplicationDetailData,
  });
}
