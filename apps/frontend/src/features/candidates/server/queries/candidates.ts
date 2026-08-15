import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  getApplicationsFiltered,
  getCandidateAiScreenings,
  getOrCreateCandidateOnboarding,
  getUsers,
} from "@workspace/db/repositories/candidate-repository";
import {
  getPositions,
  getRoundsByPositionId,
} from "@workspace/db/modules/positions";
import { parseCandidateSortOption } from "@workspace/db/candidate-list-filters";
import type { CandidateFilters } from "#/features/candidates/kanban-types";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getChecklistItemsByCandidateId } from "@workspace/db/repositories/candidate-checklist-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import { getSessionsByApplicationId } from "@workspace/db/repositories/interview-session-repository";
import {
  getCandidateWithApplications,
  getCandidatesWithPositionsFiltered,
} from "@workspace/db/repositories/candidate-repository";
import { getKanbanFilteredTotalCount } from "@workspace/db/kanban-queries";
import type { Session } from "better-auth";
import type { OnboardingTasks } from "#/features/candidates/candidates-service";

type CachedCandidate = Awaited<ReturnType<typeof getCandidateWithApplications>>;
type CandidateDocuments = Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
type CandidateScreenings = Array<
  Awaited<ReturnType<typeof getCandidateAiScreenings>>[number] & {
    structuredData: any;
  }
>;

export type CandidateDetailData = {
  candidate: CachedCandidate;
  users: Awaited<ReturnType<typeof getUsers>>;
  session: Session;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    image?: string | null;
  };
  documents: CandidateDocuments;
  screenings: CandidateScreenings;
  onboardingData: OnboardingTasks;
  checklistItems: Array<{
    id: string;
    label: string;
    checked: boolean;
  }>;
  applicationDetails: Awaited<
    ReturnType<typeof getApplicationWithInterviews>
  >[];
  initialApplicationId?: string;
};

type CandidatesIndexInput = CandidateFilters & {
  page?: number;
  view?: "table" | "kanban";
};

type FilteredCandidatesResult = Awaited<
  ReturnType<typeof getCandidatesWithPositionsFiltered>
>;

export type CandidatesIndexData = {
  positions: { id: string; name: string }[];
  candidates: FilteredCandidatesResult["candidates"];
  currentPage: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  hasFilters: boolean;
};

export const loadCandidatesIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: CandidatesIndexInput) => data)
  .handler(async ({ data: deps }): Promise<CandidatesIndexData> => {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const sort = parseCandidateSortOption(deps.sort);
    const isKanbanView = deps.view === "kanban";

    const hasFilters = Boolean(
      deps.name ||
      deps.email ||
      deps.position?.length ||
      deps.status?.length ||
      deps.source?.length ||
      (deps.sort && deps.sort !== "newest"),
    );

    if (isKanbanView) {
      const [{ positions }, totalCount] = await Promise.all([
        getPositions(),
        getKanbanFilteredTotalCount({
          name: deps.name,
          email: deps.email,
          position: deps.position,
          status: deps.status,
          source: deps.source,
          sort,
        }),
      ]);

      return {
        positions: positions.map((p) => ({ id: p.id, name: p.name })),
        candidates: [],
        currentPage: 1,
        limit,
        totalCount,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        hasFilters,
      };
    }

    const [{ positions }, candidatesResult] = await Promise.all([
      getPositions(),
      getCandidatesWithPositionsFiltered(
        deps.name,
        deps.email,
        deps.position,
        currentPage,
        limit,
        deps.status,
        deps.source,
        sort,
      ),
    ]);

    const { candidates, total: totalCount } = candidatesResult;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      candidates,
      currentPage,
      limit,
      totalCount,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters,
    };
  });

export const loadCandidatesNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async ({ context: { session } }) => {
    const { positions } = await getPositions();

    // Preload rounds for all positions
    const positionRounds: Record<
      string,
      Array<{ roundTemplateId: string; name: string }>
    > = {};
    await Promise.all(
      positions.map(async (p) => {
        const rounds = await getRoundsByPositionId(p.id);
        positionRounds[p.id] = rounds.map((r) => ({
          roundTemplateId: r.id,
          name: r.name,
        }));
      }),
    );

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      positionRounds,
      userSession: session.session,
    };
  });

type CandidateDetailInput = {
  uid: string;
  application?: string;
};

export const loadCandidateDetail = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: CandidateDetailInput) => data)
  .handler(
    async ({ data, context: { session } }): Promise<CandidateDetailData> => {
      const [users, candidate, documents, screenings] = await Promise.all([
        getUsers(),
        getCandidateWithApplications(data.uid),
        getDocumentsByCandidateId(data.uid),
        getCandidateAiScreenings(data.uid),
      ]);

      if (!candidate) {
        return {
          candidate: null,
          users: [],
          session: session.session,
          currentUser: session.user,
          documents: [],
          screenings: [],
          onboardingData: {
            contractSigned: false,
            emailProvided: false,
            onboardingPacketSent: false,
            companyEmailActivate: false,
          },
          checklistItems: [],
          applicationDetails: [],
          initialApplicationId: data.application,
        };
      }

      const [applicationDetails, rawOnboarding, checklistItems] =
        await Promise.all([
          Promise.all(
            candidate.applications.map((app) =>
              getApplicationWithInterviews(app.id),
            ),
          ),
          getOrCreateCandidateOnboarding(candidate.id),
          getChecklistItemsByCandidateId(candidate.id),
        ]);

      const onboardingData = {
        contractSigned: rawOnboarding.contractSigned ?? false,
        emailProvided: rawOnboarding.emailProvided ?? false,
        onboardingPacketSent: rawOnboarding.onboardingPacketSent ?? false,
        companyEmailActivate: rawOnboarding.companyEmailActivate ?? false,
      };

      return {
        candidate,
        users,
        session: session.session,
        currentUser: session.user,
        documents,
        screenings,
        onboardingData,
        checklistItems,
        applicationDetails,
        initialApplicationId: data.application,
      };
    },
  );

export const loadCandidateEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: uid }) => {
    const candidate = await getCandidateById(uid);
    return { candidate };
  });

type CandidateDocumentEditInput = {
  uid: string;
  documentId: string;
};

export const loadCandidateDocumentEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: CandidateDocumentEditInput) => data)
  .handler(async ({ data }) => {
    const documents = await getDocumentsByCandidateId(data.uid);
    const document = documents.find((doc) => doc.id === data.documentId);
    return { document };
  });

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { defineEntityQueries } from "#/lib/query/options";
import {
  toCandidateSort,
  toCandidateView,
  type CandidateViewMode,
  toOptionalString,
  toPageNumber,
  toStringArray,
} from "#/lib/parse-search";

export function parseCandidatesSearch(search: Record<string, unknown>) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    position: toStringArray(search.position as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    source: toStringArray(search.source as string | string[] | undefined),
    sort: toCandidateSort(search.sort),
    view: toCandidateView(search.view),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

export type CandidatesIndexSearch = ReturnType<typeof parseCandidatesSearch>;

export const candidatesIndexQueries = defineEntityQueries(
  queryKeys.candidates.list,
  (deps: CandidatesIndexSearch): Promise<CandidatesIndexData> =>
    loadCandidatesIndex({ data: deps }),
  { placeholderData: keepPreviousData },
);

export function candidateDetailQueryOptions(uid: string) {
  return queryOptions({
    queryKey: queryKeys.candidates.detail(uid),
    queryFn: async () =>
      (await loadCandidateDetail({ data: { uid } })) as CandidateDetailData,
  });
}
