import { createServerFn } from "@tanstack/react-start";
import {
  getApplicationsFiltered,
  getCandidateAiScreenings,
  getOrCreateCandidateOnboarding,
  getPositions,
  getUsers,
} from "@workspace/db/queries";
import { getCandidateById } from "@workspace/db/repositories/candidate-repository";
import { getDocumentsByCandidateId } from "@workspace/db/repositories/document-repository";
import { getApplicationWithInterviews } from "@workspace/db/repositories/interview-repository";
import {
  getCachedApplicationsFiltered,
  getCachedCandidate,
  getCachedCandidatesWithPositionsFiltered,
  getCachedDocuments,
  getCachedPositions,
} from "~/lib/cache/candidate";
import { getSession } from "~/lib/server/session.server";

type CandidatesIndexInput = {
  name?: string;
  email?: string;
  position?: string[];
  page?: number;
};

export const loadCandidatesIndex = createServerFn({ method: "GET" })
  .validator((data: CandidatesIndexInput) => data)
  .handler(async ({ data: deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, candidatesResult, applicationsResult] =
      await Promise.all([
        getCachedPositions(),
        getCachedCandidatesWithPositionsFiltered(
          deps.name,
          deps.email,
          deps.position,
          currentPage,
          limit,
        ),
        getCachedApplicationsFiltered(
          deps.name,
          deps.email,
          deps.position,
          undefined,
          currentPage,
          limit,
        ),
      ]);

    const { candidates, total: candidatesTotal } = candidatesResult;
    const { applications, total: applicationsTotal } = applicationsResult;
    const totalPages = Math.ceil(
      Math.max(candidatesTotal, applicationsTotal) / limit,
    );

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      candidates,
      applications,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(deps.name || deps.email || deps.position?.length),
    };
  });

export const loadCandidatesNew = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession();
    const { positions } = await getPositions();
    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      userSession: session?.session,
    };
  },
);

type CandidateDetailInput = {
  uid: string;
  application?: string;
};

export const loadCandidateDetail = createServerFn({ method: "GET" })
  .validator((data: CandidateDetailInput) => data)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user) {
      return { unauthorized: true as const };
    }

    const [users, candidate, documents, screenings] = await Promise.all([
      getUsers(),
      getCachedCandidate(data.uid),
      getCachedDocuments(data.uid),
      getCandidateAiScreenings(data.uid),
    ]);

    if (!candidate) {
      return {
        unauthorized: false as const,
        candidate: null,
        users: [],
        session: session.session,
        currentUser: session.user,
        documents: [],
        screenings: [],
        onboardingData: null,
        applicationDetails: [],
        initialApplicationId: data.application,
      };
    }

    const [applicationDetails, rawOnboarding] = await Promise.all([
      Promise.all(
        candidate.applications.map((app) =>
          getApplicationWithInterviews(app.id),
        ),
      ),
      getOrCreateCandidateOnboarding(candidate.id),
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
      unauthorized: false as const,
      candidate,
      users,
      session: session.session,
      currentUser: session.user,
      documents,
      screenings,
      onboardingData,
      applicationDetails,
      initialApplicationId: data.application,
    };
  });

export const loadCandidateEdit = createServerFn({ method: "GET" })
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
