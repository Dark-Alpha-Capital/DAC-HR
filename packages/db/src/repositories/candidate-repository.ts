import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@workspace/db/db";
import {
  application,
  candidate,
  candidateAiScreening,
  candidateOnboarding,
  candidatePosition,
  candidateProfile,
  position,
  user,
  type JsonObject,
} from "../schema";
import { ilike } from "../sqlite-helpers";
import {
  parseCandidateSortOption,
  type CandidateSortOption,
} from "../candidate-list-filters";
import type { ApplicationStatus } from "../application-status";
import { normalizeApplicationStatus } from "../application-status";
import { getInterviewsByApplicationId } from "./interview-repository";
import { sortCandidateListItems } from "../candidate-list-sort";

export const getCandidateById = async (id: string) => {
  try {
    const [candidateResult] = await db
      .select()
      .from(candidate)
      .where(eq(candidate.id, id));

    if (!candidateResult) {
      return null;
    }

    const applications = await db
      .select({ positionId: application.positionId })
      .from(application)
      .where(eq(application.candidateId, id));

    return {
      ...candidateResult,
      positionId: applications[0]?.positionId ?? null,
      positionIds: applications.map((a) => a.positionId),
    };
  } catch (error) {
    console.error("Error fetching candidate by id", error);
    return null;
  }
};

export const getCandidateWithApplications = async (id: string) => {
  if (!id || id.trim().length === 0) {
    console.error("Invalid candidate ID provided:", id);
    return null;
  }

  try {
    const [candidateResult] = await db
      .select()
      .from(candidate)
      .where(eq(candidate.id, id));

    if (!candidateResult) {
      return null;
    }

    const applications = await db
      .select({
        id: application.id,
        status: application.status,
        personality: application.personality,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        position: {
          id: position.id,
          name: position.name,
          slug: position.slug,
          description: position.description,
        },
      })
      .from(application)
      .innerJoin(position, eq(application.positionId, position.id))
      .where(eq(application.candidateId, id))
      .orderBy(asc(application.createdAt));

    const applicationsWithInterviews = await Promise.all(
      applications.map(async (app) => {
        const interviews = await getInterviewsByApplicationId(app.id);
        return {
          ...app,
          interviews,
        };
      }),
    );

    const [profile] = await db
      .select()
      .from(candidateProfile)
      .where(eq(candidateProfile.candidateId, id));

    return {
      ...candidateResult,
      profile: profile ?? null,
      applications: applicationsWithInterviews,
    };
  } catch (error) {
    console.error("Error fetching candidate with applications");
    console.error("Candidate ID:", id);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
    }
    return null;
  }
};

async function getCandidateIdsMatchingApplicationFilters(
  statuses?: string[],
  positionIds?: string[],
): Promise<string[] | null> {
  if (!statuses?.length) {
    return null;
  }

  const appConditions = [
    // SAFETY: statuses come from validated query params; casting the string
    // array to the enum type lets drizzle type the column in `inArray`.
    inArray(application.status, statuses as ApplicationStatus[]),
  ];

  if (positionIds && positionIds.length > 0) {
    appConditions.push(inArray(application.positionId, positionIds));
  }

  const matchingApps = await db
    .select({ candidateId: application.candidateId })
    .from(application)
    .where(and(...appConditions));

  return [...new Set(matchingApps.map((app) => app.candidateId))];
}

/**
 *
 * Fetches all positions from the database, optionally filtered by hire level and status
 * @param hireLevels Optional array of hire level values to filter by
 * @param statuses Optional array of status values to filter by
 * @param page Page number (1-indexed) for pagination
 * @param limit Number of positions per page
 * @returns An object with positions array and total count
 */

export const getApplicationsFiltered = async (
  nameSearch?: string,
  emailSearch?: string,
  positionIds?: string[],
  statuses?: string[],
  page: number = 1,
  limit: number = 50,
  sort: CandidateSortOption = "newest",
): Promise<{
  applications: Array<{
    id: string;
    candidateId: string;
    positionId: string;
    status: string;
    personality: string | null;
    createdAt: Date;
    updatedAt: Date;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    position: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
    };
    interviews: Array<{
      id: string;
      status: string;
    }>;
  }>;
  total: number;
}> => {
  try {
    let query = db
      .select({
        application: {
          id: application.id,
          candidateId: application.candidateId,
          positionId: application.positionId,
          status: application.status,
          personality: application.personality,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
        },
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
        },
        position: {
          id: position.id,
          name: position.name,
          slug: position.slug,
          description: position.description,
        },
      })
      .from(application)
      .innerJoin(candidate, eq(application.candidateId, candidate.id))
      .innerJoin(position, eq(application.positionId, position.id));

    // Build filter conditions
    const conditions = [];

    if (nameSearch) {
      const searchLower = nameSearch.toLowerCase();
      conditions.push(
        or(
          sql`LOWER(${candidate.firstName}) LIKE ${`%${searchLower}%`}`,
          sql`LOWER(${candidate.lastName}) LIKE ${`%${searchLower}%`}`,
          sql`LOWER(CONCAT(${candidate.firstName}, ' ', ${candidate.lastName})) LIKE ${`%${searchLower}%`}`,
        ),
      );
    }

    if (emailSearch) {
      conditions.push(
        sql`LOWER(${candidate.email}) LIKE ${`%${emailSearch.toLowerCase()}%`}`,
      );
    }

    if (positionIds && positionIds.length > 0) {
      conditions.push(inArray(application.positionId, positionIds));
    }

    if (statuses && statuses.length > 0) {
      conditions.push(
        // SAFETY: statuses come from validated query params; casting the
        // string array to the enum type lets drizzle type the inArray column.
        inArray(application.status, statuses as ApplicationStatus[]),
      );
    }

    if (conditions.length > 0) {
      // SAFETY: where() returns the same select query builder type; the
      // reassignment needs the self-reference cast.
      query = query.where(and(...conditions)) as typeof query;
    }

    const allResults = await query;
    const total = allResults.length;

    const sortedResults = (() => {
      const sorted = [...allResults];
      switch (parseCandidateSortOption(sort)) {
        case "oldest":
          return sorted.sort(
            (a, b) =>
              a.application.createdAt.getTime() -
              b.application.createdAt.getTime(),
          );
        case "name_asc":
          return sorted.sort((a, b) => {
            const nameA = `${a.candidate.lastName} ${a.candidate.firstName}`;
            const nameB = `${b.candidate.lastName} ${b.candidate.firstName}`;
            return nameA.localeCompare(nameB);
          });
        case "name_desc":
          return sorted.sort((a, b) => {
            const nameA = `${a.candidate.lastName} ${a.candidate.firstName}`;
            const nameB = `${b.candidate.lastName} ${b.candidate.firstName}`;
            return nameB.localeCompare(nameA);
          });
        case "updated":
          return sorted.sort(
            (a, b) =>
              b.application.updatedAt.getTime() -
              a.application.updatedAt.getTime(),
          );
        case "newest":
        default:
          return sorted.sort(
            (a, b) =>
              b.application.createdAt.getTime() -
              a.application.createdAt.getTime(),
          );
      }
    })();

    const offset = (page - 1) * limit;
    const paginatedResults = sortedResults.slice(offset, offset + limit);

    // Fetch interviews for paginated applications
    const applicationsWithInterviews = await Promise.all(
      paginatedResults.map(async (result) => {
        const interviews = await getInterviewsByApplicationId(
          result.application.id,
        );
        return {
          ...result.application,
          candidate: result.candidate,
          position: result.position,
          interviews: interviews.map((interview) => ({
            id: interview.id,
            status: interview.status,
          })),
        };
      }),
    );

    return {
      applications: applicationsWithInterviews,
      total,
    };
  } catch (error) {
    console.error("Error fetching filtered applications", error);
    return { applications: [], total: 0 };
  }
};

export const getCandidatesWithPositionsFiltered = async (
  nameSearch?: string,
  emailSearch?: string,
  positionIds?: string[],
  page: number = 1,
  limit: number = 50,
  statuses?: string[],
  sources?: string[],
  sort: CandidateSortOption = "newest",
): Promise<{
  candidates: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    location: string | null;
    locationCity: string | null;
    locationState: string | null;
    source: string | null;
    sourceUrl: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    position: { id: string; name: string } | null;
    applicationStatus: ApplicationStatus;
  }>;
  total: number;
}> => {
  try {
    let query = db
      .select({
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.location,
          locationCity: candidate.locationCity,
          locationState: candidate.locationState,
          source: candidate.source,
          sourceUrl: candidate.sourceUrl,
          note: candidate.note,
          createdAt: candidate.createdAt,
          updatedAt: candidate.updatedAt,
        },
        position: {
          id: position.id,
          name: position.name,
        },
      })
      .from(candidate)
      .leftJoin(
        candidatePosition,
        eq(candidate.id, candidatePosition.candidateId),
      )
      .leftJoin(position, eq(candidatePosition.positionId, position.id));

    // Build filter conditions
    const conditions = [];

    // Name search (first name or last name)
    if (nameSearch && nameSearch.trim()) {
      const searchTerm = `%${nameSearch.trim()}%`;
      conditions.push(
        or(
          ilike(candidate.firstName, searchTerm),
          ilike(candidate.lastName, searchTerm),
        )!,
      );
    }

    // Email search
    if (emailSearch && emailSearch.trim()) {
      const searchTerm = `%${emailSearch.trim()}%`;
      conditions.push(ilike(candidate.email, searchTerm));
    }

    // Position filter
    if (positionIds && positionIds.length > 0) {
      conditions.push(inArray(position.id, positionIds));
    }

    // Source filter
    if (sources && sources.length > 0) {
      conditions.push(inArray(candidate.source, sources));
    }

    // Stage/status filter via applications
    const statusCandidateIds = await getCandidateIdsMatchingApplicationFilters(
      statuses,
      positionIds,
    );
    if (statusCandidateIds) {
      if (statusCandidateIds.length === 0) {
        return { candidates: [], total: 0 };
      }
      conditions.push(inArray(candidate.id, statusCandidateIds));
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      // SAFETY: where() returns the same select query builder type; the
      // reassignment needs the self-reference cast.
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query.orderBy(desc(candidate.createdAt));

    // Map results and handle duplicates (candidates can have multiple positions)
    const candidateMap = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        location: string | null;
        locationCity: string | null;
        locationState: string | null;
        source: string | null;
        sourceUrl: string | null;
        note: string | null;
        createdAt: Date;
        updatedAt: Date;
        position: { id: string; name: string } | null;
      }
    >();

    for (const result of results) {
      const candidateId = result.candidate.id;
      if (!candidateMap.has(candidateId)) {
        candidateMap.set(candidateId, {
          ...result.candidate,
          position: result.position?.id
            ? {
                id: result.position.id,
                name: result.position.name,
              }
            : null,
        });
      }
    }

    // Convert to array and apply sort
    const allCandidates = sortCandidateListItems(
      Array.from(candidateMap.values()),
      parseCandidateSortOption(sort),
    );

    // Get total count
    const total = allCandidates.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedCandidates = allCandidates.slice(offset, offset + limit);

    // Fetch the most recent application status for each paginated candidate
    const candidateIds = paginatedCandidates.map((c) => c.id);
    const applications = await db
      .select({
        candidateId: application.candidateId,
        status: application.status,
        updatedAt: application.updatedAt,
      })
      .from(application)
      .where(inArray(application.candidateId, candidateIds))
      .orderBy(desc(application.updatedAt));

    // Group applications by candidateId and get the most recent one
    const applicationStatusMap = new Map<string, ApplicationStatus>();
    for (const app of applications) {
      if (!applicationStatusMap.has(app.candidateId)) {
        applicationStatusMap.set(
          app.candidateId,
          normalizeApplicationStatus(app.status) ?? "ai_screening",
        );
      }
    }

    // Add application status to candidates
    const candidatesWithStatus = paginatedCandidates.map((candidate) => ({
      ...candidate,
      applicationStatus:
        applicationStatusMap.get(candidate.id) ?? "ai_screening",
    }));

    return { candidates: candidatesWithStatus, total };
  } catch (error) {
    console.error("Error fetching filtered candidates with positions", error);
    return { candidates: [], total: 0 };
  }
};

/**
 *
 * Fetches a candidate by its ID
 * @param id The ID of the candidate to fetch
 * @returns The candidate with positionId or null if not found
 */

export const getUsers = async () => {
  try {
    return await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user);
  } catch (error) {
    console.error("Error fetching users", error);
    return [];
  }
};

/**
 * Fetches candidates by position ID
 * @param positionId The ID of the position
 * @returns Array of candidates
 */

export const getOrCreateCandidateOnboarding = async (candidateId: string) => {
  const [newOnboarding] = await db
    .insert(candidateOnboarding)
    .values({ candidateId })
    .onConflictDoNothing({
      target: candidateOnboarding.candidateId,
    })
    .returning()
    .execute();

  if (newOnboarding) {
    return newOnboarding;
  }

  const [existingOnboarding] = await db
    .select()
    .from(candidateOnboarding)
    .where(eq(candidateOnboarding.candidateId, candidateId))
    .limit(1)
    .execute();

  return existingOnboarding;
};

/**
 * Fetches all employees from the database with position information
 * @param positionIds Optional array of position IDs to filter by
 * @param departments Optional array of department values to filter by
 * @returns An array of employees with position data
 */

export const saveCandidateAiScreening = async (params: {
  candidateId: string;
  positionId?: string | null;
  applicationId?: string | null;
  analysis: string;
  model?: string;
  structuredData?: JsonObject;
}) => {
  try {
    const [screening] = await db
      .insert(candidateAiScreening)
      .values({
        candidateId: params.candidateId,
        positionId: params.positionId || null,
        applicationId: params.applicationId || null,
        analysis: params.analysis,
        model: params.model || "gpt-4o-mini",
        structuredData: params.structuredData || null,
      })
      .returning();

    return screening;
  } catch (error) {
    console.error("Error saving candidate AI screening", error);
    return null;
  }
};

/**
 * Fetches all AI screening results for a candidate, optionally filtered by position
 * @param candidateId The ID of the candidate
 * @param positionId Optional position ID to filter by
 * @returns Array of AI screening records, ordered by most recent first
 */

export const getCandidateAiScreenings = async (
  candidateId: string,
  positionId?: string,
) => {
  try {
    const conditions = [eq(candidateAiScreening.candidateId, candidateId)];

    if (positionId) {
      conditions.push(eq(candidateAiScreening.positionId, positionId));
    }

    const results = await db
      .select()
      .from(candidateAiScreening)
      .where(and(...conditions))
      .orderBy(desc(candidateAiScreening.createdAt));

    return results;
  } catch (error) {
    console.error("Error fetching candidate AI screenings", error);
    return [];
  }
};

/**
 * Fetches the most recent AI screening result for a candidate, optionally filtered by position
 * @param candidateId The ID of the candidate
 * @param positionId Optional position ID to filter by
 * @returns The most recent AI screening record or null if not found
 */

export const getLatestCandidateAiScreening = async (
  candidateId: string,
  positionId?: string,
) => {
  try {
    const conditions = [eq(candidateAiScreening.candidateId, candidateId)];

    if (positionId) {
      conditions.push(eq(candidateAiScreening.positionId, positionId));
    }

    const [result] = await db
      .select()
      .from(candidateAiScreening)
      .where(and(...conditions))
      .orderBy(desc(candidateAiScreening.createdAt))
      .limit(1);

    return result || null;
  } catch (error) {
    console.error("Error fetching latest candidate AI screening", error);
    return null;
  }
};

/**
 * Fetches all document categories
 * @returns An array of document categories
 */
