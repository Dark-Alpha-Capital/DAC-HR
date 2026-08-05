import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import {
  getApplicationsFiltered,
  getCandidateAiScreenings,
  getOrCreateCandidateOnboarding,
  getUsers,
} from "@workspace/db/repositories/candidate-repository";
import { getPositions, getRoundsByPositionId } from "@workspace/db/modules/positions";
import {
  parseCandidateSortOption,
  type CandidateSortOption,
} from "@workspace/db/candidate-list-filters";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getChecklistItemsByCandidateId } from "@workspace/db/repositories/candidate-checklist-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import { getSessionsByApplicationId } from "@workspace/db/repositories/interview-session-repository";
import { getCandidateWithApplications, getCandidatesWithPositionsFiltered } from "@workspace/db/repositories/candidate-repository";
import { getKanbanFilteredTotalCount } from "@workspace/db/kanban-queries";
import type { Session } from "better-auth";

type CachedCandidate = Awaited<ReturnType<typeof getCandidateWithApplications>>;
type CandidateDocuments = Awaited<ReturnType<typeof getDocumentsByCandidateId>>;
type CandidateScreenings = Awaited<ReturnType<typeof getCandidateAiScreenings>>;

export type CandidateDetailData = {
  candidate: CachedCandidate;
  users: Awaited<ReturnType<typeof getUsers>>;
  session: Session;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
  };
  documents: CandidateDocuments;
  screenings: CandidateScreenings;
  onboardingData: {
    contractSigned: boolean;
    registrationEmailSent: boolean;
    packetSent: boolean;
    companyEmailActivate: boolean;
  } | null;
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

type CandidatesIndexInput = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  source?: string[];
  sort?: CandidateSortOption;
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
  .handler(async ({ data, context: { session } }) => {

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
        onboardingData: null,
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

    const onboardingData = rawOnboarding
      ? {
        contractSigned: rawOnboarding.contractSigned ?? false,
        registrationEmailSent: rawOnboarding.emailProvided ?? false,
        packetSent: rawOnboarding.onboardingPacketSent ?? false,
        companyEmailActivate: rawOnboarding.companyEmailActivate ?? false,
      }
      : null;

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
  });

export const loadCandidateEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: uid }) => {
    const [candidate, { positions }] = await Promise.all([
      getCandidateById(uid),
      getPositions(),
    ]);

    return {
      candidate,
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
    };
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
        deps.name ||
        deps.email ||
        deps.position?.length ||
        deps.status?.length,
      ),
    };
  });

export type ApplicationDetailData = {
  application: Awaited<ReturnType<typeof getApplicationWithInterviews>>;
  candidate: Awaited<ReturnType<typeof getCandidateById>>;
  sessions: Awaited<ReturnType<typeof getSessionsByApplicationId>>;
  aiScreenings: Awaited<ReturnType<typeof getCandidateAiScreenings>>;
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
      aiScreenings,
      documents,
      users,
    };
  });
