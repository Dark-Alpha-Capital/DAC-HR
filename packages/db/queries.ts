import { db } from "./db";
import { ilike, jsonArrayOverlap, jsonArrayTagSearch } from "./sqlite-helpers";
import {
  position,
  candidate,
  candidatePosition,
  questionBank,
  roundTemplate,
  positionRoundTemplates,
  roundTemplateQuestions,
  application,
  interview,
  interviewFeedback,
  user,
  documents,
  documentCategories,
  documentCategoryRelations,
  candidateDocument,
  candidateOnboarding,
  employee,
  auditLog,
  candidateAiScreening,
  interviewAiAnalysis,
  recruiterWeeklyCheckin,
} from "./schema";
import {
  eq,
  asc,
  desc,
  inArray,
  and,
  or,
  sql,
  count,
  gte,
  lte,
} from "drizzle-orm";

/**
 *
 * Fetches all positions from the database, optionally filtered by hire level and status
 * @param hireLevels Optional array of hire level values to filter by
 * @param statuses Optional array of status values to filter by
 * @param page Page number (1-indexed) for pagination
 * @param limit Number of positions per page
 * @returns An object with positions array and total count
 */
export const getPositions = async (
  hireLevels?: string[],
  statuses?: string[],
  page: number = 1,
  limit: number = 50,
): Promise<{
  positions: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    hireLevel: string | null;
    status: string;
  }>;
  total: number;
}> => {
  try {
    let query = db
      .select({
        id: position.id,
        name: position.name,
        slug: position.slug,
        description: position.description,
        hireLevel: position.hireLevel,
        status: position.status,
      })
      .from(position);

    const conditions = [];

    // Apply hire level filter if provided
    if (hireLevels && hireLevels.length > 0) {
      // Validate hire levels against enum values
      const validHireLevels = hireLevels.filter(
        (
          level,
        ): level is
          | "managing-director"
          | "vice-president"
          | "associate"
          | "analyst"
          | "intern" =>
          [
            "managing-director",
            "vice-president",
            "associate",
            "analyst",
            "intern",
          ].includes(level),
      );
      if (validHireLevels.length > 0) {
        conditions.push(inArray(position.hireLevel, validHireLevels));
      }
    }

    // Apply status filter if provided
    if (statuses && statuses.length > 0) {
      // Validate statuses against enum values
      const validStatuses = statuses.filter(
        (status): status is "active" | "hold" | "passed" | "upcoming" =>
          ["active", "hold", "passed", "upcoming"].includes(status),
      );
      if (validStatuses.length > 0) {
        conditions.push(inArray(position.status, validStatuses));
      }
    }

    // Apply all conditions with AND
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const allResults = await query;
    const total = allResults.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);

    return { positions: paginatedResults, total };
  } catch (error) {
    console.error("Error fetching positions", error);
    return { positions: [], total: 0 };
  }
};

/**
 *
 * Fetches a position by its slug
 * @param slug The slug of the position to fetch
 * @returns The position or null if not found
 */
export const getPositionBySlug = async (slug: string) => {
  try {
    const [positionResult] = await db
      .select()
      .from(position)
      .where(eq(position.slug, slug));
    return positionResult;
  } catch (error) {
    console.error("Error fetching position by slug", error);
    return null;
  }
};

/**
 *
 * Fetches all candidates from the database
 * @returns An array of candidates
 */
export const getCandidates = async () => {
  try {
    return await db.select().from(candidate);
  } catch (error) {
    console.error("Error fetching candidates", error);
    return [];
  }
};

/**
 * Fetches all applications with candidate and position details
 * @returns An array of applications with candidate and position information
 */
export const getAllApplications = async () => {
  try {
    const results = await db
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
      .innerJoin(position, eq(application.positionId, position.id))
      .orderBy(asc(application.createdAt));

    // Fetch interviews for each application
    const applicationsWithInterviews = await Promise.all(
      results.map(async (result) => {
        const interviews = await getInterviewsByApplicationId(
          result.application.id,
        );
        return {
          ...result.application,
          candidate: result.candidate,
          position: result.position,
          interviews,
        };
      }),
    );

    return applicationsWithInterviews;
  } catch (error) {
    console.error("Error fetching all applications", error);
    return [];
  }
};

/**
 * Fetches applications with filtering and pagination support
 * @param nameSearch Optional search term for candidate first name or last name
 * @param emailSearch Optional search term for candidate email
 * @param positionIds Optional array of position IDs to filter by
 * @param statuses Optional array of status values to filter by
 * @param page Page number (1-indexed) for pagination
 * @param limit Number of applications per page
 * @returns An object with applications array and total count
 */
export const getApplicationsFiltered = async (
  nameSearch?: string,
  emailSearch?: string,
  positionIds?: string[],
  statuses?: string[],
  page: number = 1,
  limit: number = 50,
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
        inArray(
          application.status,
          statuses as Array<
            | "ai_screening"
            | "first_round_recruiter_call"
            | "second_round_technical_screening"
            | "third_round_final_ceo"
            | "contract_offer"
            | "onboarding"
            | "rejected"
            | "withdrawn"
          >,
        ),
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Order by createdAt descending (newest first)
    query = query.orderBy(desc(application.createdAt)) as typeof query;

    // Get all results for filtering
    const allResults = await query;

    // Get total count before pagination
    const total = allResults.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);

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

export const getCandidatesWithPositions = async () => {
  try {
    const results = await db
      .select({
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
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

    return results.map((result) => ({
      ...result.candidate,
      position: result.position?.id
        ? {
          id: result.position.id,
          name: result.position.name,
        }
        : null,
    }));
  } catch (error) {
    console.error("Error fetching candidates with positions", error);
    return [];
  }
};

/**
 * Fetches candidates with positions, optionally filtered by name, email, and position IDs
 * @param nameSearch Optional search term for first name or last name
 * @param emailSearch Optional search term for email
 * @param positionIds Optional array of position IDs to filter by
 * @param page Optional page number (1-indexed) for pagination
 * @param limit Optional number of candidates per page (default: 50)
 * @returns An object with candidates array and total count
 */
export const getCandidatesWithPositionsFiltered = async (
  nameSearch?: string,
  emailSearch?: string,
  positionIds?: string[],
  page: number = 1,
  limit: number = 50,
): Promise<{
  candidates: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    location: string | null;
    source: string | null;
    sourceUrl: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    position: { id: string; name: string } | null;
    applicationStatus: string | null;
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

    // Apply conditions if any
    if (conditions.length > 0) {
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

    // Convert to array and sort by createdAt descending (already sorted from query)
    const allCandidates = Array.from(candidateMap.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
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
    const applicationStatusMap = new Map<string, string>();
    for (const app of applications) {
      if (!applicationStatusMap.has(app.candidateId)) {
        applicationStatusMap.set(app.candidateId, app.status);
      }
    }

    // Add application status to candidates
    const candidatesWithStatus = paginatedCandidates.map((candidate) => ({
      ...candidate,
      applicationStatus: applicationStatusMap.get(candidate.id) || null,
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
export const getCandidateById = async (id: string) => {
  try {
    const [candidateResult] = await db
      .select()
      .from(candidate)
      .where(eq(candidate.id, id));

    if (!candidateResult) {
      return null;
    }

    // Fetch the positionId from candidatePosition table
    const [positionRelation] = await db
      .select()
      .from(candidatePosition)
      .where(eq(candidatePosition.candidateId, id))
      .limit(1);

    return {
      ...candidateResult,
      positionId: positionRelation?.positionId || null,
    };
  } catch (error) {
    console.error("Error fetching candidate by id", error);
    return null;
  }
};

/**
 *
 * Fetches a candidate by its ID with all their applications
 * @param id The ID of the candidate to fetch
 * @returns The candidate with applications (including position details) or null if not found
 */
export const getCandidateWithApplications = async (id: string) => {
  // Validate ID format
  if (!id || typeof id !== "string" || id.trim().length === 0) {
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

    // Fetch all applications for this candidate with position details
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

    // Fetch interviews for each application
    const applicationsWithInterviews = await Promise.all(
      applications.map(async (app) => {
        const interviews = await getInterviewsByApplicationId(app.id);
        return {
          ...app,
          interviews,
        };
      }),
    );

    return {
      ...candidateResult,
      applications: applicationsWithInterviews,
    };
  } catch (error) {
    // Enhanced error logging
    console.error("Error fetching candidate with applications");
    console.error("Candidate ID:", id);
    console.error("ID type:", typeof id);
    console.error("ID length:", id?.length);

    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      // Check for postgres.js error properties (query and parameters are non-enumerable)
      const errorAny = error as any;

      // postgres.js errors have query and parameters properties
      if (errorAny.query) {
        console.error("Failed query:", errorAny.query);
      }
      if (errorAny.parameters) {
        console.error("Query parameters:", errorAny.parameters);
      }
      if (errorAny.cause) {
        console.error("Error cause:", errorAny.cause);
      }

      // Check for PostgreSQL-specific error properties
      if (errorAny.code) {
        console.error("PostgreSQL error code:", errorAny.code);
      }
      if (errorAny.detail) {
        console.error("PostgreSQL error detail:", errorAny.detail);
      }
      if (errorAny.hint) {
        console.error("PostgreSQL error hint:", errorAny.hint);
      }
      if (errorAny.position) {
        console.error("PostgreSQL error position:", errorAny.position);
      }
      if (errorAny.internal_position) {
        console.error(
          "PostgreSQL internal position:",
          errorAny.internal_position,
        );
      }
      if (errorAny.internal_query) {
        console.error("PostgreSQL internal query:", errorAny.internal_query);
      }
      if (errorAny.where) {
        console.error("PostgreSQL error where:", errorAny.where);
      }
      if (errorAny.schema) {
        console.error("PostgreSQL error schema:", errorAny.schema);
      }
      if (errorAny.table) {
        console.error("PostgreSQL error table:", errorAny.table);
      }
      if (errorAny.column) {
        console.error("PostgreSQL error column:", errorAny.column);
      }
      if (errorAny.data_type) {
        console.error("PostgreSQL error data type:", errorAny.data_type);
      }
      if (errorAny.constraint) {
        console.error("PostgreSQL error constraint:", errorAny.constraint);
      }
    } else {
      console.error("Unknown error type:", error);
      console.error("Error stringified:", JSON.stringify(error, null, 2));
    }

    // Return null to prevent page crash, but log the error for debugging
    return null;
  }
};

/**
 *
 * Fetches all questions from the database
 * @returns An array of questions
 */
export const getQuestions = async () => {
  try {
    return await db.select().from(questionBank);
  } catch (error) {
    console.error("Error fetching questions", error);
    return [];
  }
};

/**
 *
 * Fetches all questions with their associated rounds and positions from the database.
 *
 * Shape:
 * - Each question has:
 *   - rounds: [{ id, name, positions: [{ id, name }] }]
 *   - positions: de-duplicated flat list of all linked positions
 * @param search Optional search term to filter questions by text
 * @param positionIds Optional array of position IDs to filter by
 * @param roundIds Optional array of round IDs to filter by
 * @param page Page number (1-indexed) for pagination
 * @param limit Number of questions per page
 * @returns An object with questions array and total count
 */
export const getQuestionsWithRounds = async (
  search?: string,
  positionIds?: string[],
  roundIds?: string[],
  page: number = 1,
  limit: number = 50,
): Promise<{
  questions: Array<{
    id: string;
    questionText: string;
    createdAt: Date;
    updatedAt: Date;
    rounds: Array<{
      id: string;
      name: string;
      positions: Array<{ id: string; name: string }>;
    }>;
    positions: Array<{ id: string; name: string }>;
  }>;
  total: number;
}> => {
  try {
    const results = await db
      .select({
        questionId: questionBank.id,
        questionText: questionBank.questionText,
        createdAt: questionBank.createdAt,
        updatedAt: questionBank.updatedAt,
        roundId: roundTemplate.id,
        roundName: roundTemplate.name,
        positionId: position.id,
        positionName: position.name,
      })
      .from(questionBank)
      .leftJoin(
        roundTemplateQuestions,
        eq(questionBank.id, roundTemplateQuestions.questionId),
      )
      .leftJoin(
        roundTemplate,
        eq(roundTemplateQuestions.roundTemplateId, roundTemplate.id),
      )
      .leftJoin(
        positionRoundTemplates,
        eq(roundTemplate.id, positionRoundTemplates.roundTemplateId),
      )
      .leftJoin(position, eq(positionRoundTemplates.positionId, position.id));

    // Group questions by question ID and collect rounds and positions
    const questionsMap = new Map<
      string,
      {
        id: string;
        questionText: string;
        createdAt: Date;
        updatedAt: Date;
        rounds: Array<{
          id: string;
          name: string;
          positions: Array<{ id: string; name: string }>;
        }>;
        positions: Array<{ id: string; name: string }>;
      }
    >();

    for (const result of results) {
      const questionId = result.questionId;
      if (!questionsMap.has(questionId)) {
        questionsMap.set(questionId, {
          id: result.questionId,
          questionText: result.questionText,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          rounds: [],
          positions: [],
        });
      }

      const question = questionsMap.get(questionId)!;
      if (result.roundId) {
        // Find or create the round entry for this question
        let round = question.rounds.find((r) => r.id === result.roundId);
        if (!round) {
          round = {
            id: result.roundId,
            name: result.roundName || "",
            positions: [],
          };
          question.rounds.push(round);
        }

        // Attach position to this specific round (if present)
        if (result.positionId) {
          if (!round.positions.some((p) => p.id === result.positionId)) {
            round.positions.push({
              id: result.positionId,
              name: result.positionName || "",
            });
          }
        }
      }

      // Maintain a de-duplicated flat list of positions at the question level
      if (result.positionId) {
        if (!question.positions.some((p) => p.id === result.positionId)) {
          question.positions.push({
            id: result.positionId,
            name: result.positionName || "",
          });
        }
      }
    }

    let allQuestions = Array.from(questionsMap.values());

    // Apply filters
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      allQuestions = allQuestions.filter((question) =>
        question.questionText.toLowerCase().includes(searchLower),
      );
    }

    if (positionIds && positionIds.length > 0) {
      allQuestions = allQuestions.filter((question) => {
        const questionPositionIds = question.positions.map((p) => p.id);
        return positionIds.some((posId) => questionPositionIds.includes(posId));
      });
    }

    if (roundIds && roundIds.length > 0) {
      allQuestions = allQuestions.filter((question) => {
        const questionRoundIds = question.rounds.map((r) => r.id);
        return roundIds.some((roundId) => questionRoundIds.includes(roundId));
      });
    }

    const total = allQuestions.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedQuestions = allQuestions.slice(offset, offset + limit);

    return { questions: paginatedQuestions, total };
  } catch (error) {
    console.error("Error fetching questions with rounds", error);
    return { questions: [], total: 0 };
  }
};

/**
 *
 * Fetches a question by its ID
 * @param id The ID of the question to fetch
 * @returns The question or null if not found
 */
export const getQuestionById = async (id: string) => {
  try {
    const [questionResult] = await db
      .select()
      .from(questionBank)
      .where(eq(questionBank.id, id));
    return questionResult || null;
  } catch (error) {
    console.error("Error fetching question by id", error);
    return null;
  }
};

/**
 *
 * Fetches all questions linked to a specific round
 * @param roundId The ID of the round template
 * @returns An array of questions
 */
export const getQuestionsByRoundId = async (roundId: string) => {
  try {
    const results = await db
      .select({
        id: questionBank.id,
        questionText: questionBank.questionText,
        createdAt: questionBank.createdAt,
        updatedAt: questionBank.updatedAt,
      })
      .from(roundTemplateQuestions)
      .innerJoin(
        questionBank,
        eq(roundTemplateQuestions.questionId, questionBank.id),
      )
      .where(eq(roundTemplateQuestions.roundTemplateId, roundId));

    return results;
  } catch (error) {
    console.error("Error fetching questions by round id", error);
    return [];
  }
};

function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const getQuestionsForInterviewSession = async (
  roundId: string,
  seed: string,
  categoryLimits?: Record<string, number>,
) => {
  try {
    const results = await db
      .select({
        id: questionBank.id,
        questionText: questionBank.questionText,
        questionType: questionBank.questionType,
        category: questionBank.questionCategory,
        timeLimitSeconds: questionBank.timeLimitSeconds,
        orderIndex: questionBank.orderIndex,
        createdAt: questionBank.createdAt,
        updatedAt: questionBank.updatedAt,
      })
      .from(roundTemplateQuestions)
      .innerJoin(
        questionBank,
        eq(roundTemplateQuestions.questionId, questionBank.id),
      )
      .where(
        and(
          eq(roundTemplateQuestions.roundTemplateId, roundId),
          eq(questionBank.isActive, true),
        ),
      );

    const groupedByCategory = new Map<string, typeof results>();
    for (const q of results) {
      const cat = q.category ?? "screening";
      if (!groupedByCategory.has(cat)) {
        groupedByCategory.set(cat, []);
      }
      groupedByCategory.get(cat)!.push(q);
    }

    const numericSeed = hashString(seed);
    const defaults: Record<string, number> = {
      screening: 5,
      technical: 5,
      behavioral: 5,
    };
    const limits = { ...defaults, ...categoryLimits };

    const selected: typeof results = [];
    for (const [category, questions] of groupedByCategory) {
      const limit = limits[category] ?? 5;
      const shuffled = seededShuffle(questions, numericSeed + hashString(category));
      selected.push(...shuffled.slice(0, limit));
    }

    const finalOrdered = selected.sort(
      (a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999),
    );

    return finalOrdered;
  } catch (error) {
    console.error("Error fetching questions for interview session", error);
    return [];
  }
};

/**
 *
 * Fetches all round templates from the database
 * @returns An array of round templates
 */
export const getRounds = async () => {
  try {
    return await db.select().from(roundTemplate);
  } catch (error) {
    console.error("Error fetching rounds", error);
    return [];
  }
};

/**
 *
 * Fetches round templates with their linked positions, optionally filtered by position IDs
 * @param positionIds Optional array of position IDs to filter by
 * @param page Page number (1-indexed) for pagination
 * @param limit Number of rounds per page
 * @returns An object with rounds array and total count
 */
export const getRoundsWithPositions = async (
  positionIds?: string[],
  page: number = 1,
  limit: number = 50,
): Promise<{
  rounds: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    positions: Array<{ id: string; name: string }>;
  }>;
  total: number;
}> => {
  try {
    // If filtering by position IDs, we need to first get the round IDs that match
    // Then fetch all rounds with all their positions
    let filteredRoundIds: string[] | undefined;

    if (positionIds && positionIds.length > 0) {
      const matchingRounds = await db
        .select({ roundId: positionRoundTemplates.roundTemplateId })
        .from(positionRoundTemplates)
        .where(inArray(positionRoundTemplates.positionId, positionIds));

      filteredRoundIds = [...new Set(matchingRounds.map((r) => r.roundId))];

      // If no rounds match, return empty array
      if (filteredRoundIds.length === 0) {
        return { rounds: [], total: 0 };
      }
    }

    const results = await db
      .select({
        round: {
          id: roundTemplate.id,
          name: roundTemplate.name,
          description: roundTemplate.description,
          createdAt: roundTemplate.createdAt,
          updatedAt: roundTemplate.updatedAt,
        },
        position: {
          id: position.id,
          name: position.name,
        },
      })
      .from(roundTemplate)
      .leftJoin(
        positionRoundTemplates,
        eq(roundTemplate.id, positionRoundTemplates.roundTemplateId),
      )
      .leftJoin(position, eq(positionRoundTemplates.positionId, position.id))
      .where(
        filteredRoundIds && filteredRoundIds.length > 0
          ? inArray(roundTemplate.id, filteredRoundIds)
          : undefined,
      );

    // Group rounds by round ID and collect positions
    const roundsMap = new Map<
      string,
      {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        positions: Array<{ id: string; name: string }>;
      }
    >();

    for (const result of results) {
      const roundId = result.round.id;
      if (!roundsMap.has(roundId)) {
        roundsMap.set(roundId, {
          ...result.round,
          positions: [],
        });
      }

      const round = roundsMap.get(roundId)!;
      if (result.position?.id) {
        // Check if position already added (avoid duplicates)
        if (!round.positions.some((p) => p.id === result.position!.id)) {
          round.positions.push({
            id: result.position.id,
            name: result.position.name,
          });
        }
      }
    }

    const allRounds = Array.from(roundsMap.values());
    const total = allRounds.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedRounds = allRounds.slice(offset, offset + limit);

    return { rounds: paginatedRounds, total };
  } catch (error) {
    console.error("Error fetching rounds with positions", error);
    return { rounds: [], total: 0 };
  }
};

/**
 *
 * Fetches all rounds linked to a specific position
 * @param positionId The ID of the position
 * @returns An array of rounds
 */
export const getRoundsByPositionId = async (positionId: string) => {
  try {
    const results = await db
      .select({
        round: {
          id: roundTemplate.id,
          name: roundTemplate.name,
          description: roundTemplate.description,
          createdAt: roundTemplate.createdAt,
          updatedAt: roundTemplate.updatedAt,
        },
        positionRoundTemplate: {
          id: positionRoundTemplates.id,
        },
      })
      .from(positionRoundTemplates)
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id),
      )
      .where(eq(positionRoundTemplates.positionId, positionId));

    return results.map((result) => ({
      ...result.round,
      positionRoundTemplateId: result.positionRoundTemplate.id,
    }));
  } catch (error) {
    console.error("Error fetching rounds by position id", error);
    return [];
  }
};

/**
 *
 * Fetches a round template by its ID
 * @param id The ID of the round template to fetch
 * @returns The round template or null if not found
 */
export const getRoundById = async (id: string) => {
  try {
    const [roundResult] = await db
      .select({
        id: roundTemplate.id,
        name: roundTemplate.name,
        description: roundTemplate.description,
        createdAt: roundTemplate.createdAt,
        updatedAt: roundTemplate.updatedAt,
      })
      .from(roundTemplate)
      .where(eq(roundTemplate.id, id));
    return roundResult || null;
  } catch (error) {
    console.error("Error fetching round by id", error);
    return null;
  }
};

/**
 * Fetches the first position ID linked to a round template (for pre-selecting in forms).
 * @param roundTemplateId The ID of the round template
 * @returns The first linked position ID, or empty string if none
 */
export const getFirstPositionIdForRoundTemplate = async (
  roundTemplateId: string,
): Promise<string> => {
  try {
    const [result] = await db
      .select({ positionId: positionRoundTemplates.positionId })
      .from(positionRoundTemplates)
      .where(eq(positionRoundTemplates.roundTemplateId, roundTemplateId))
      .limit(1);

    return result?.positionId ?? "";
  } catch (error) {
    console.error(
      "Error fetching first position for round template",
      error,
    );
    return "";
  }
};

/**
 * Fetches all positions linked to a specific round template
 * @param roundId The ID of the round template
 * @returns An array of positions linked to the round
 */
export const getPositionsByRoundId = async (roundId: string) => {
  try {
    const results = await db
      .select({
        id: position.id,
        name: position.name,
        slug: position.slug,
      })
      .from(positionRoundTemplates)
      .innerJoin(position, eq(positionRoundTemplates.positionId, position.id))
      .where(eq(positionRoundTemplates.roundTemplateId, roundId));

    return results;
  } catch (error) {
    console.error("Error fetching positions by round id", error);
    return [];
  }
};

/**
 * Fetches a positionRoundTemplate by ID
 * @param positionRoundTemplateId The ID of the position round template
 * @returns The positionRoundTemplate or null if not found
 */
export const getPositionRoundTemplateById = async (
  positionRoundTemplateId: string,
) => {
  try {
    const [result] = await db
      .select({
        id: positionRoundTemplates.id,
        positionId: positionRoundTemplates.positionId,
        roundTemplateId: positionRoundTemplates.roundTemplateId,
        roundTemplate: {
          id: roundTemplate.id,
          name: roundTemplate.name,
          description: roundTemplate.description,
        },
      })
      .from(positionRoundTemplates)
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id),
      )
      .where(eq(positionRoundTemplates.id, positionRoundTemplateId));
    return result || null;
  } catch (error) {
    console.error("Error fetching position round template by id", error);
    return null;
  }
};

/**
 * Fetches an application by ID with full details including position and rounds
 * @param applicationId The ID of the application
 * @returns The application with position and round details or null if not found
 */
export const getApplicationById = async (applicationId: string) => {
  try {
    const [appResult] = await db
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
        position: {
          id: position.id,
          name: position.name,
          slug: position.slug,
          description: position.description,
        },
      })
      .from(application)
      .innerJoin(position, eq(application.positionId, position.id))
      .where(eq(application.id, applicationId));

    if (!appResult) {
      return null;
    }

    // Get all rounds for this position
    const rounds = await getRoundsByPositionId(
      appResult.application.positionId,
    );

    return {
      ...appResult.application,
      position: appResult.position,
      rounds,
    };
  } catch (error) {
    console.error("Error fetching application by id", error);
    return null;
  }
};

/**
 * Fetches all interviews for an application
 * @param applicationId The ID of the application
 * @returns An array of interviews with round and interviewer details
 */
export const getInterviewsByApplicationId = async (applicationId: string) => {
  try {
    const results = await db
      .select({
        interview: {
          id: interview.id,
          applicationId: interview.applicationId,
          status: interview.status,
          rating: interview.rating,
          scheduledAt: interview.scheduledAt,
          overallFeedback: interview.overallFeedback,
          createdAt: interview.createdAt,
        },
        roundTemplate: {
          id: roundTemplate.id,
          name: roundTemplate.name,
          description: roundTemplate.description,
        },
        positionRoundTemplate: {
          id: positionRoundTemplates.id,
        },
        interviewer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(interview)
      .innerJoin(
        positionRoundTemplates,
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id),
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id),
      )
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(eq(interview.applicationId, applicationId));

    return results.map((result) => ({
      ...result.interview,
      roundTemplate: result.roundTemplate,
      positionRoundTemplateId: result.positionRoundTemplate.id,
      interviewer: result.interviewer,
    }));
  } catch (error) {
    console.error("Error fetching interviews by application id", error);
    return [];
  }
};

/**
 * Fetches an interview by ID with full details
 * @param interviewId The ID of the interview
 * @returns The interview with round, questions, and feedback or null if not found
 */
export const getInterviewById = async (interviewId: string) => {
  try {
    const [interviewResult] = await db
      .select({
        interview: {
          id: interview.id,
          applicationId: interview.applicationId,
          status: interview.status,
          rating: interview.rating,
          scheduledAt: interview.scheduledAt,
          overallFeedback: interview.overallFeedback,
          createdAt: interview.createdAt,
        },
        roundTemplate: {
          id: roundTemplate.id,
          name: roundTemplate.name,
          description: roundTemplate.description,
        },
        positionRoundTemplate: {
          id: positionRoundTemplates.id,
        },
        interviewer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(interview)
      .innerJoin(
        positionRoundTemplates,
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id),
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id),
      )
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(eq(interview.id, interviewId));

    if (!interviewResult) {
      return null;
    }

    // Get questions for this round template
    const questions = await getQuestionsByRoundId(
      interviewResult.roundTemplate.id,
    );

    // Get feedback for each question
    const feedbackResults = await db
      .select({
        id: interviewFeedback.id,
        questionId: interviewFeedback.questionId,
        notes: interviewFeedback.notes,
        rating: interviewFeedback.rating,
        question: {
          id: questionBank.id,
          questionText: questionBank.questionText,
        },
      })
      .from(interviewFeedback)
      .innerJoin(
        questionBank,
        eq(interviewFeedback.questionId, questionBank.id),
      )
      .where(eq(interviewFeedback.interviewId, interviewId));

    // Map questions with their feedback
    const questionsWithFeedback = questions.map((question) => {
      const feedback = feedbackResults.find(
        (f) => f.questionId === question.id,
      );
      return {
        ...question,
        feedback: feedback
          ? {
            id: feedback.id,
            notes: feedback.notes,
            rating: feedback.rating,
          }
          : null,
      };
    });

    return {
      ...interviewResult.interview,
      roundTemplate: interviewResult.roundTemplate,
      positionRoundTemplateId: interviewResult.positionRoundTemplate.id,
      interviewer: interviewResult.interviewer,
      questions: questionsWithFeedback,
    };
  } catch (error) {
    console.error("Error fetching interview by id", error);
    return null;
  }
};

/**
 * Fetches an application with all interviews and their progress
 * @param applicationId The ID of the application
 * @returns The application with position, rounds, and interviews or null if not found
 */
export const getApplicationWithInterviews = async (applicationId: string) => {
  try {
    const app = await getApplicationById(applicationId);
    if (!app) {
      return null;
    }

    const interviews = await getInterviewsByApplicationId(applicationId);

    return {
      ...app,
      interviews,
    };
  } catch (error) {
    console.error("Error fetching application with interviews", error);
    return null;
  }
};

/**
 * Fetches all users from the database (for interviewer selection)
 * @returns An array of users
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
export async function getCandidatesByPositionId(positionId: string) {
  try {
    const results = await db
      .select({
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
        },
      })
      .from(candidate)
      .leftJoin(
        candidatePosition,
        eq(candidate.id, candidatePosition.candidateId),
      )
      .where(eq(candidatePosition.positionId, positionId));
    return results.map((result) => result.candidate);
  } catch (error) {
    console.error("Error fetching candidates by position id", error);
    return [];
  }
}

/**
 * Fetches all documents from the database
 * @param categoryFilters Optional array of category IDs to filter by (new system)
 * @param nameSearch Optional search term for document name
 * @param tagsSearch Optional search term for tags
 * @param page Page number (1-indexed) for pagination
 * @param limit Number of documents per page
 * @returns An object with documents array and total count
 */
export async function getDocuments(
  categoryFilters?: string[],
  nameSearch?: string,
  tagsSearch?: string,
  page: number = 1,
  limit: number = 50,
): Promise<{
  documents: Array<{
    id: string;
    name: string;
    url: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    categories: Array<{
      id: string;
      name: string;
    }>;
  }>;
  total: number;
}> {
  try {
    let query = db
      .select({
        document: documents,
      })
      .from(documents);

    // Build filter conditions
    const conditions = [];

    // Category filter - filter by category IDs (new system)
    if (categoryFilters && categoryFilters.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${documentCategoryRelations}
          WHERE ${documentCategoryRelations.documentId} = ${documents.id}
          AND ${documentCategoryRelations.categoryId} IN (${sql.join(
          categoryFilters.map((id) => sql`${id}`),
          sql`, `,
        )})
        )`,
      );
    }

    if (nameSearch && nameSearch.trim()) {
      const searchTerm = `%${nameSearch.trim()}%`;
      conditions.push(ilike(documents.name, searchTerm));
    }

    if (tagsSearch && tagsSearch.trim()) {
      conditions.push(
        jsonArrayTagSearch(documents.tags, tagsSearch.trim().toLowerCase()),
      );
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const allResults = await query.orderBy(desc(documents.createdAt));
    const total = allResults.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);

    // Fetch categories for each paginated document
    const documentsWithCategories = await Promise.all(
      paginatedResults.map(async (result) => {
        const categories = await getDocumentCategoriesByDocumentId(
          result.document.id,
        );
        return {
          ...result.document,
          tags: result.document.tags || [],
          categories,
        };
      }),
    );

    return { documents: documentsWithCategories, total };
  } catch (error) {
    console.error("Error fetching documents", error);
    return { documents: [], total: 0 };
  }
}

/**
 * Fetches documents by candidate ID
 * @param candidateId The ID of the candidate
 * @returns Array of candidate documents
 */
export async function getDocumentsByCandidateId(candidateId: string) {
  try {
    const results = await db
      .select()
      .from(candidateDocument)
      .where(eq(candidateDocument.candidateId, candidateId));
    return results;
  } catch (error) {
    console.error("Error fetching documents by candidate id", error);
    return [];
  }
}

/**
 * Fetches dashboard statistics including total candidates, active candidates, interviews scheduled, and average time to hire
 * @returns Dashboard statistics object with percentage changes
 */
export const getDashboardStats = async () => {
  try {
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    // Total candidates count
    const [totalCandidatesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(candidate);
    const totalCandidates = totalCandidatesResult?.count || 0;

    // Total candidates last month (30-60 days ago)
    const [totalCandidatesLastMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(candidate)
      .where(
        sql`${candidate.createdAt} >= ${sixtyDaysAgo} AND ${candidate.createdAt} < ${thirtyDaysAgo}`,
      );
    const totalCandidatesLastMonth = totalCandidatesLastMonthResult?.count || 0;

    // Total candidates this month
    const [totalCandidatesThisMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(candidate)
      .where(sql`${candidate.createdAt} >= ${thirtyDaysAgo}`);
    const totalCandidatesThisMonth = totalCandidatesThisMonthResult?.count || 0;

    const activePipelineStatuses = [
      "ai_screening",
      "first_round_recruiter_call",
      "second_round_technical_screening",
      "third_round_final_ceo",
      "contract_offer",
    ] as const;

    // Active candidates count (applications still in the hiring pipeline)
    const [activeCandidatesResult] = await db
      .select({
        count: sql<number>`count(DISTINCT ${application.candidateId})`,
      })
      .from(application)
      .where(inArray(application.status, [...activePipelineStatuses]));
    const activeCandidates = activeCandidatesResult?.count || 0;

    // Active candidates last month
    const [activeCandidatesLastMonthResult] = await db
      .select({
        count: sql<number>`count(DISTINCT ${application.candidateId})`,
      })
      .from(application)
      .where(
        and(
          inArray(application.status, [...activePipelineStatuses]),
          sql`${application.updatedAt} >= ${sixtyDaysAgo} AND ${application.updatedAt} < ${thirtyDaysAgo}`,
        ),
      );
    const activeCandidatesLastMonth =
      activeCandidatesLastMonthResult?.count || 0;

    // Interviews scheduled count (interviews with status 'pending')
    const [interviewsScheduledResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(interview)
      .where(eq(interview.status, "pending"));
    const interviewsScheduled = interviewsScheduledResult?.count || 0;

    // Average time to hire (in days) - from application created to onboarding status
    const [avgTimeToHireResult] = await db
      .select({
        avgDays: sql<number>`cast(avg((${application.updatedAt} - ${application.createdAt}) / 86400000.0) as integer)`,
      })
      .from(application)
      .where(eq(application.status, "onboarding"));
    const avgTimeToHire = avgTimeToHireResult?.avgDays || 0;

    // Average time to hire last month
    const [avgTimeToHireLastMonthResult] = await db
      .select({
        avgDays: sql<number>`cast(avg((${application.updatedAt} - ${application.createdAt}) / 86400000.0) as integer)`,
      })
      .from(application)
      .where(
        sql`${application.status} = 'onboarding' AND ${application.updatedAt} >= ${sixtyDaysAgo} AND ${application.updatedAt} < ${thirtyDaysAgo}`,
      );
    const avgTimeToHireLastMonth = avgTimeToHireLastMonthResult?.avgDays || 0;

    // Total employees count
    const [totalEmployeesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employee);
    const totalEmployees = totalEmployeesResult?.count || 0;

    // Total positions count
    const [totalPositionsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(position);
    const totalPositions = totalPositionsResult?.count || 0;

    // Applications this month
    const [applicationsThisMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(application)
      .where(sql`${application.createdAt} >= ${thirtyDaysAgo}`);
    const applicationsThisMonth = applicationsThisMonthResult?.count || 0;

    // Applications last month
    const [applicationsLastMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(application)
      .where(
        sql`${application.createdAt} >= ${sixtyDaysAgo} AND ${application.createdAt} < ${thirtyDaysAgo}`,
      );
    const applicationsLastMonth = applicationsLastMonthResult?.count || 0;

    // Hired this month
    const [hiredThisMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(application)
      .where(
        sql`${application.status} = 'onboarding' AND ${application.updatedAt} >= ${thirtyDaysAgo}`,
      );
    const hiredThisMonth = hiredThisMonthResult?.count || 0;

    // Hired last month
    const [hiredLastMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(application)
      .where(
        sql`${application.status} = 'onboarding' AND ${application.updatedAt} >= ${sixtyDaysAgo} AND ${application.updatedAt} < ${thirtyDaysAgo}`,
      );
    const hiredLastMonth = hiredLastMonthResult?.count || 0;

    // Total interviews count
    const [totalInterviewsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(interview);
    const totalInterviews = totalInterviewsResult?.count || 0;

    // Completed interviews (not pending)
    const [completedInterviewsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(interview)
      .where(sql`${interview.status} != 'pending'`);
    const completedInterviews = completedInterviewsResult?.count || 0;

    // Average interview rating
    const [avgInterviewRatingResult] = await db
      .select({
        avgRating: sql<number>`AVG(${interview.rating})::numeric`,
      })
      .from(interview)
      .where(sql`${interview.rating} IS NOT NULL`);
    const avgInterviewRating =
      avgInterviewRatingResult && avgInterviewRatingResult.avgRating !== null
        ? Number(avgInterviewRatingResult.avgRating)
        : 0;

    // Calculate percentage changes
    const calculatePercentageChange = (
      current: number,
      previous: number,
    ): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      totalCandidates,
      totalCandidatesThisMonth,
      totalCandidatesChange: calculatePercentageChange(
        totalCandidatesThisMonth,
        totalCandidatesLastMonth,
      ),
      activeCandidates,
      activeCandidatesChange: calculatePercentageChange(
        activeCandidates,
        activeCandidatesLastMonth,
      ),
      interviewsScheduled,
      avgTimeToHire,
      avgTimeToHireChange: calculatePercentageChange(
        avgTimeToHireLastMonth,
        avgTimeToHire,
      ), // Inverted because lower is better
      totalEmployees,
      totalPositions,
      applicationsThisMonth,
      applicationsLastMonth,
      applicationsChange: calculatePercentageChange(
        applicationsThisMonth,
        applicationsLastMonth,
      ),
      hiredThisMonth,
      hiredLastMonth,
      hiredChange: calculatePercentageChange(hiredThisMonth, hiredLastMonth),
      totalInterviews,
      completedInterviews,
      interviewCompletionRate:
        totalInterviews > 0
          ? Math.round((completedInterviews / totalInterviews) * 100)
          : 0,
      avgInterviewRating: Math.round(avgInterviewRating * 10) / 10,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats", error);
    return {
      totalCandidates: 0,
      totalCandidatesThisMonth: 0,
      totalCandidatesChange: 0,
      activeCandidates: 0,
      activeCandidatesChange: 0,
      interviewsScheduled: 0,
      avgTimeToHire: 0,
      avgTimeToHireChange: 0,
      totalEmployees: 0,
      totalPositions: 0,
      applicationsThisMonth: 0,
      applicationsLastMonth: 0,
      applicationsChange: 0,
      hiredThisMonth: 0,
      hiredLastMonth: 0,
      hiredChange: 0,
      totalInterviews: 0,
      completedInterviews: 0,
      interviewCompletionRate: 0,
      avgInterviewRating: 0,
    };
  }
};

/**
 * Fetches candidate distribution by application status
 * @returns Array of status counts
 */
export const getCandidatesByStatus = async () => {
  try {
    const results = await db
      .select({
        status: application.status,
        count: sql<number>`count(DISTINCT ${application.candidateId})`,
      })
      .from(application)
      .groupBy(application.status);

    return results;
  } catch (error) {
    console.error("Error fetching candidates by status", error);
    return [];
  }
};

/**
 * Fetches candidate count by position
 * @returns Array of position names with candidate counts
 */
export const getCandidatesByPosition = async () => {
  try {
    const results = await db
      .select({
        positionName: position.name,
        count: sql<number>`count(DISTINCT ${application.candidateId})`,
      })
      .from(application)
      .innerJoin(position, eq(application.positionId, position.id))
      .groupBy(position.name);

    return results;
  } catch (error) {
    console.error("Error fetching candidates by position", error);
    return [];
  }
};

/**
 * Fetches upcoming pending interviews
 * @param limit Optional limit for number of interviews to return
 * @returns Array of pending interviews with candidate and position details
 */
export const getUpcomingInterviews = async (limit?: number) => {
  try {
    let query = db
      .select({
        interview: {
          id: interview.id,
          scheduledAt: interview.scheduledAt,
          status: interview.status,
        },
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
        },
        position: {
          id: position.id,
          name: position.name,
        },
        roundTemplate: {
          id: roundTemplate.id,
          name: roundTemplate.name,
        },
        interviewer: {
          id: user.id,
          name: user.name,
        },
      })
      .from(interview)
      .innerJoin(application, eq(interview.applicationId, application.id))
      .innerJoin(candidate, eq(application.candidateId, candidate.id))
      .innerJoin(position, eq(application.positionId, position.id))
      .innerJoin(
        positionRoundTemplates,
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id),
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id),
      )
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(
        and(
          eq(interview.status, "pending"),
          sql`${interview.scheduledAt} >= ${new Date()}`,
        ),
      )
      .orderBy(asc(interview.scheduledAt));

    if (limit) {
      query = query.limit(limit) as typeof query;
    }

    const results = await query;

    return results.map((result) => ({
      id: result.interview.id,
      scheduledAt: result.interview.scheduledAt,
      candidate: result.candidate,
      position: result.position,
      roundTemplate: result.roundTemplate,
      interviewer: result.interviewer,
    }));
  } catch (error) {
    console.error("Error fetching upcoming interviews", error);
    return [];
  }
};

/**
 * Fetches recent activity across all candidates (application status changes, interview scheduling, etc.)
 * @param limit Optional limit for number of activities to return
 * @returns Array of recent activities
 */
export const getRecentActivity = async (limit: number = 10) => {
  try {
    // Get recent applications
    const recentApplications = await db
      .select({
        type: sql<string>`'application'`,
        id: application.id,
        timestamp: application.updatedAt,
        candidateId: candidate.id,
        candidateFirstName: candidate.firstName,
        candidateLastName: candidate.lastName,
        positionName: position.name,
        status: application.status,
        userId: sql<string>`NULL`,
        userName: sql<string>`NULL`,
      })
      .from(application)
      .innerJoin(candidate, eq(application.candidateId, candidate.id))
      .innerJoin(position, eq(application.positionId, position.id))
      .orderBy(sql`${application.updatedAt} DESC`)
      .limit(limit);

    // Get recent interviews
    const recentInterviews = await db
      .select({
        type: sql<string>`'interview'`,
        id: interview.id,
        timestamp: interview.createdAt,
        candidateId: candidate.id,
        candidateFirstName: candidate.firstName,
        candidateLastName: candidate.lastName,
        positionName: position.name,
        status: interview.status,
        userId: user.id,
        userName: user.name,
        roundName: roundTemplate.name,
      })
      .from(interview)
      .innerJoin(application, eq(interview.applicationId, application.id))
      .innerJoin(candidate, eq(application.candidateId, candidate.id))
      .innerJoin(position, eq(application.positionId, position.id))
      .innerJoin(
        positionRoundTemplates,
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id),
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id),
      )
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .orderBy(sql`${interview.createdAt} DESC`)
      .limit(limit);

    // Combine and sort all activities
    const allActivities = [
      ...recentApplications.map((a) => ({
        type: "application" as const,
        id: a.id,
        timestamp: a.timestamp,
        candidate: {
          id: a.candidateId,
          firstName: a.candidateFirstName,
          lastName: a.candidateLastName,
        },
        positionName: a.positionName,
        status: a.status,
        user: null,
        roundName: null,
      })),
      ...recentInterviews.map((i) => ({
        type: "interview" as const,
        id: i.id,
        timestamp: i.timestamp,
        candidate: {
          id: i.candidateId,
          firstName: i.candidateFirstName,
          lastName: i.candidateLastName,
        },
        positionName: i.positionName,
        status: i.status,
        user:
          i.userId && i.userName ? { id: i.userId, name: i.userName } : null,
        roundName: i.roundName,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return allActivities.slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent activity", error);
    return [];
  }
};

export async function getCandidateOnboarding(candidateId: string) {
  const onboarding = await db
    .select()
    .from(candidateOnboarding)
    .where(eq(candidateOnboarding.candidateId, candidateId))
    .limit(1)
    .execute();
  return onboarding;
}

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
export const getEmployees = async (
  positionIds?: string[],
  departments?: string[],
  name?: string,
  email?: string,
  page: number = 1,
  limit: number = 50,
): Promise<{
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    department: string[];
    positionId: string | null;
    profileImage: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
    position: { id: string; name: string; slug: string } | null;
  }>;
  total: number;
}> => {
  try {
    let query = db
      .select({
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department,
          positionId: employee.positionId,
          profileImage: employee.profileImage,
          bio: employee.bio,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
        position: {
          id: position.id,
          name: position.name,
          slug: position.slug,
        },
      })
      .from(employee)
      .leftJoin(position, eq(employee.positionId, position.id));

    // Apply filters
    const conditions = [];
    if (positionIds && positionIds.length > 0) {
      conditions.push(inArray(employee.positionId, positionIds));
    }
    if (departments && departments.length > 0) {
      conditions.push(jsonArrayOverlap(employee.department, departments));
    }
    if (name && name.trim()) {
      const searchTerm = `%${name.trim()}%`;
      conditions.push(
        sql`lower(${employee.firstName} || ' ' || ${employee.lastName}) like lower(${searchTerm})`,
      );
    }
    // Note: Email filtering is not available yet as employees don't have an email field in the schema
    // This parameter is included for future compatibility

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Get total count before pagination
    const allResults = await query.orderBy(asc(employee.createdAt));
    const total = allResults.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);

    return {
      employees: paginatedResults.map((result) => ({
        ...result.employee,
        position: result.position,
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching employees", error);
    return { employees: [], total: 0 };
  }
};

/**
 * Fetches an employee by its ID with position information
 * @param id The ID of the employee to fetch
 * @returns The employee with position data or null if not found
 */
export const getEmployeeById = async (id: string) => {
  try {
    const [result] = await db
      .select({
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department,
          positionId: employee.positionId,
          profileImage: employee.profileImage,
          bio: employee.bio,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
        position: {
          id: position.id,
          name: position.name,
          slug: position.slug,
        },
      })
      .from(employee)
      .leftJoin(position, eq(employee.positionId, position.id))
      .where(eq(employee.id, id));

    if (!result) {
      return null;
    }

    return {
      ...result.employee,
      position: result.position,
    };
  } catch (error) {
    console.error("Error fetching employee by id", error);
    return null;
  }
};

/**
 * Fetches applications over time (last 6 months)
 * @returns Array of monthly application counts
 */
export const getApplicationsOverTime = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthExpr = sql<string>`strftime('%Y-%m', datetime(${application.createdAt} / 1000, 'unixepoch'))`;

    const results = await db
      .select({
        month: monthExpr,
        count: sql<number>`count(*)`,
      })
      .from(application)
      .where(sql`${application.createdAt} >= ${sixMonthsAgo}`)
      .groupBy(monthExpr)
      .orderBy(monthExpr);

    return results.map((r) => ({
      month: r.month,
      count: r.count,
    }));
  } catch (error) {
    console.error("Error fetching applications over time", error);
    return [];
  }
};

/**
 * Fetches employee distribution by department
 * @returns Array of department counts
 */
export const getEmployeesByDepartment = async () => {
  try {
    const results = await db
      .select({
        department: employee.department,
        count: sql<number>`count(*)`,
      })
      .from(employee)
      .groupBy(employee.department);

    return results.map((r) => ({
      department: r.department,
      count: r.count,
    }));
  } catch (error) {
    console.error("Error fetching employees by department", error);
    return [];
  }
};

/**
 * Fetches interview ratings distribution
 * @returns Array of rating counts
 */
export const getInterviewRatingsDistribution = async () => {
  try {
    const results = await db
      .select({
        rating: interview.rating,
        count: sql<number>`count(*)`,
      })
      .from(interview)
      .where(sql`${interview.rating} IS NOT NULL`)
      .groupBy(interview.rating)
      .orderBy(interview.rating);

    return results.map((r) => ({
      rating: r.rating || 0,
      count: r.count,
    }));
  } catch (error) {
    console.error("Error fetching interview ratings distribution", error);
    return [];
  }
};

/**
 * Fetches interview status distribution
 * @returns Array of interview status counts
 */
export const getInterviewStatusDistribution = async () => {
  try {
    const results = await db
      .select({
        status: interview.status,
        count: sql<number>`count(*)`,
      })
      .from(interview)
      .groupBy(interview.status);

    return results;
  } catch (error) {
    console.error("Error fetching interview status distribution", error);
    return [];
  }
};

/**
 * Inserts an audit log entry into the database
 * @param params Object containing userId, action, entityType, entityId, and details
 * @returns The created audit log entry or null if insertion fails
 */
export const insertAuditLog = async (params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
}) => {
  try {
    const [logEntry] = await db
      .insert(auditLog)
      .values({
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
      })
      .returning();

    return logEntry;
  } catch (error) {
    console.error("Error inserting audit log", error);
    return null;
  }
};

/**
 * Fetches audit logs with pagination and filters
 * @param options Object containing filters and pagination options
 * @returns Object containing audit logs array and total count
 */
export const getAuditLogs = async (options: {
  action?: string;
  entityType?: string;
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}) => {
  try {
    const {
      action,
      entityType,
      userId,
      page = 1,
      limit = 10,
      search,
      startDate,
      endDate,
    } = options;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const conditions = [];

    if (action && action.trim()) {
      conditions.push(
        ilike(auditLog.action, `%${action.trim()}%`),
      );
    }

    if (entityType && entityType.trim()) {
      conditions.push(
        ilike(auditLog.entityType, `%${entityType.trim()}%`),
      );
    }

    if (userId && userId.trim()) {
      conditions.push(eq(auditLog.userId, userId.trim()));
    }

    // Search across action, entityType, and entityId
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(auditLog.action, searchTerm),
          ilike(auditLog.entityType, searchTerm),
          ilike(auditLog.entityId, searchTerm),
        )!,
      );
    }

    // Date range filtering
    if (startDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      conditions.push(gte(auditLog.createdAt, start));
    }

    if (endDate) {
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      // Add 1 day and set to end of day to include the entire end date
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLog.createdAt, endOfDay));
    }

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(auditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0]?.count ?? 0;

    // Fetch audit logs with user information
    const logs = await db
      .select({
        id: auditLog.id,
        userId: auditLog.userId,
        userName: user.name,
        userEmail: user.email,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        details: auditLog.details,
        createdAt: auditLog.createdAt,
        updatedAt: auditLog.updatedAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.userId, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        userEmail: log.userEmail,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching audit logs", error);
    return { logs: [], total: 0 };
  }
};

/**
 * Saves an AI screening analysis result for a candidate
 * @param params Object containing candidateId, positionId (optional), applicationId (optional), analysis text, and model name
 * @returns The created AI screening record or null if insertion fails
 */
export const saveCandidateAiScreening = async (params: {
  candidateId: string;
  positionId?: string | null;
  applicationId?: string | null;
  analysis: string;
  model?: string;
  structuredData?: any;
}) => {
  try {
    const [screening] = await db
      .insert(candidateAiScreening)
      .values({
        candidateId: params.candidateId,
        positionId: params.positionId || null,
        applicationId: params.applicationId || null,
        analysis: params.analysis,
        model: params.model || "gemini-2.5-flash",
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
export async function getDocumentCategories() {
  try {
    const results = await db
      .select()
      .from(documentCategories)
      .orderBy(asc(documentCategories.name));
    return results;
  } catch (error) {
    console.error("Error fetching document categories", error);
    return [];
  }
}

/**
 * Fetches a single document category by ID
 * @param id The category ID
 * @returns The category or null if not found
 */
export async function getDocumentCategoryById(id: string) {
  try {
    const [result] = await db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.id, id))
      .limit(1);
    return result || null;
  } catch (error) {
    console.error("Error fetching document category", error);
    return null;
  }
}

/**
 * Creates a new document category
 * @param name The category name
 * @param description Optional description
 * @returns The created category
 */
export async function createDocumentCategory(
  name: string,
  description?: string,
) {
  try {
    const [result] = await db
      .insert(documentCategories)
      .values({
        name,
        description: description || null,
      })
      .returning();
    return result;
  } catch (error) {
    console.error("Error creating document category", error);
    throw error;
  }
}

/**
 * Updates a document category
 * @param id The category ID
 * @param name The new name
 * @param description Optional new description
 * @returns The updated category
 */
export async function updateDocumentCategory(
  id: string,
  name: string,
  description?: string,
) {
  try {
    const [result] = await db
      .update(documentCategories)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(documentCategories.id, id))
      .returning();
    return result;
  } catch (error) {
    console.error("Error updating document category", error);
    throw error;
  }
}

/**
 * Deletes a document category
 * @param id The category ID
 */
export async function deleteDocumentCategory(id: string) {
  try {
    await db.delete(documentCategories).where(eq(documentCategories.id, id));
  } catch (error) {
    console.error("Error deleting document category", error);
    throw error;
  }
}

/**
 * Gets categories for a specific document
 * @param documentId The document ID
 * @returns Array of categories for the document
 */
export async function getDocumentCategoriesByDocumentId(documentId: string) {
  try {
    const results = await db
      .select({
        id: documentCategories.id,
        name: documentCategories.name,
        description: documentCategories.description,
        createdAt: documentCategories.createdAt,
        updatedAt: documentCategories.updatedAt,
      })
      .from(documentCategoryRelations)
      .innerJoin(
        documentCategories,
        eq(documentCategoryRelations.categoryId, documentCategories.id),
      )
      .where(eq(documentCategoryRelations.documentId, documentId));
    return results;
  } catch (error) {
    console.error("Error fetching document categories", error);
    return [];
  }
}

/**
 * Sets categories for a document (replaces existing)
 * @param documentId The document ID
 * @param categoryIds Array of category IDs
 */
export async function setDocumentCategories(
  documentId: string,
  categoryIds: string[],
) {
  try {
    // Delete existing relations
    await db
      .delete(documentCategoryRelations)
      .where(eq(documentCategoryRelations.documentId, documentId));

    // Insert new relations
    if (categoryIds.length > 0) {
      await db.insert(documentCategoryRelations).values(
        categoryIds.map((categoryId) => ({
          documentId,
          categoryId,
        })),
      );
    }
  } catch (error) {
    console.error("Error setting document categories", error);
    throw error;
  }
}

/**
 * Saves an interview AI analysis result
 * @param params Object containing interviewId, applicationId, positionId, analysis text, customPrompt, and model name
 * @returns The created interview AI analysis record or null if insertion fails
 */
export const saveInterviewAiAnalysis = async (params: {
  interviewId: string;
  applicationId?: string | null;
  positionId?: string | null;
  analysis: string;
  customPrompt?: string | null;
  model?: string;
  structuredData?: unknown;
}) => {
  try {
    const [result] = await db
      .insert(interviewAiAnalysis)
      .values({
        interviewId: params.interviewId,
        applicationId: params.applicationId || null,
        positionId: params.positionId || null,
        analysis: params.analysis,
        customPrompt: params.customPrompt || null,
        model: params.model || "gemini-2.5-flash",
        structuredData: params.structuredData || null,
      })
      .returning();

    return result;
  } catch (error) {
    console.error("Error saving interview AI analysis", error);
    return null;
  }
};

/**
 * Fetches all AI analysis results for an interview
 * @param interviewId The ID of the interview
 * @returns Array of interview AI analysis records, ordered by most recent first
 */
export const getInterviewAiAnalysesByInterviewId = async (
  interviewId: string,
) => {
  try {
    const results = await db
      .select()
      .from(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.interviewId, interviewId))
      .orderBy(desc(interviewAiAnalysis.createdAt));

    return results;
  } catch (error) {
    console.error("Error fetching interview AI analyses", error);
    return [];
  }
};

/**
 * Fetches the most recent AI analysis result for an interview
 * @param interviewId The ID of the interview
 * @returns The most recent interview AI analysis record or null if not found
 */
export const getLatestInterviewAiAnalysis = async (interviewId: string) => {
  try {
    const [result] = await db
      .select()
      .from(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.interviewId, interviewId))
      .orderBy(desc(interviewAiAnalysis.createdAt))
      .limit(1);

    return result || null;
  } catch (error) {
    console.error("Error fetching latest interview AI analysis", error);
    return null;
  }
};

/**
 * Deletes an interview AI analysis by ID
 * @param analysisId The ID of the analysis to delete
 * @returns True if deleted successfully, false otherwise
 */
export const deleteInterviewAiAnalysis = async (analysisId: string) => {
  try {
    const deletedRows = await db
      .delete(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.id, analysisId))
      .returning({ id: interviewAiAnalysis.id });
    return deletedRows.length > 0;
  } catch (error) {
    console.error("Error deleting interview AI analysis", error);
    return false;
  }
};

/**
 * Deletes an interview AI analysis by analysis ID scoped to interview ID
 * @param interviewId The interview ID from route context
 * @param analysisId The analysis ID to delete
 * @returns Deletion result with reason for non-delete cases
 */
export const deleteInterviewAiAnalysisForInterview = async (
  interviewId: string,
  analysisId: string,
): Promise<{ deleted: boolean; reason?: "not_found" | "mismatch" }> => {
  try {
    const [analysisRecord] = await db
      .select({
        id: interviewAiAnalysis.id,
        interviewId: interviewAiAnalysis.interviewId,
      })
      .from(interviewAiAnalysis)
      .where(eq(interviewAiAnalysis.id, analysisId))
      .limit(1);

    if (!analysisRecord) {
      return { deleted: false, reason: "not_found" };
    }

    if (analysisRecord.interviewId !== interviewId) {
      return { deleted: false, reason: "mismatch" };
    }

    const deletedRows = await db
      .delete(interviewAiAnalysis)
      .where(
        and(
          eq(interviewAiAnalysis.id, analysisId),
          eq(interviewAiAnalysis.interviewId, interviewId),
        ),
      )
      .returning({ id: interviewAiAnalysis.id });

    if (deletedRows.length === 0) {
      return { deleted: false, reason: "not_found" };
    }

    return { deleted: true };
  } catch (error) {
    console.error("Error deleting scoped interview AI analysis", error);
    return { deleted: false };
  }
};

/**
 * Fetches all weekly check-ins with user info
 * @param page Page number (1-indexed) for pagination
 * @param limit Number of check-ins per page
 * @returns An object with check-ins array and total count
 */
export const getWeeklyCheckins = async (
  page: number = 1,
  limit: number = 50,
): Promise<{
  checkins: Array<{
    id: string;
    userId: string | null;
    weekStartDate: Date;
    weekEndDate: Date;
    recruiterName: string;
    positionsWorked: string[] | null;
    candidatesSourced: number | null;
    candidatesScreened: number | null;
    candidatesRejected: number | null;
    candidatesAdvanced2ndRound: number | null;
    candidatesAdvanced3rdRound: number | null;
    offersExtended: number | null;
    offersAccepted: number | null;
    bestPerformingChannels: string[] | null;
    avgTimeToScreen: string | null;
    delaysOrBottlenecks: string | null;
    concernsOrEscalations: string | null;
    supportNeeded: string | null;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
  total: number;
}> => {
  try {
    const allResults = await db
      .select({
        id: recruiterWeeklyCheckin.id,
        userId: recruiterWeeklyCheckin.userId,
        weekStartDate: recruiterWeeklyCheckin.weekStartDate,
        weekEndDate: recruiterWeeklyCheckin.weekEndDate,
        recruiterName: recruiterWeeklyCheckin.recruiterName,
        positionsWorked: recruiterWeeklyCheckin.positionsWorked,
        candidatesSourced: recruiterWeeklyCheckin.candidatesSourced,
        candidatesScreened: recruiterWeeklyCheckin.candidatesScreened,
        candidatesRejected: recruiterWeeklyCheckin.candidatesRejected,
        candidatesAdvanced2ndRound:
          recruiterWeeklyCheckin.candidatesAdvanced2ndRound,
        candidatesAdvanced3rdRound:
          recruiterWeeklyCheckin.candidatesAdvanced3rdRound,
        offersExtended: recruiterWeeklyCheckin.offersExtended,
        offersAccepted: recruiterWeeklyCheckin.offersAccepted,
        bestPerformingChannels: recruiterWeeklyCheckin.bestPerformingChannels,
        avgTimeToScreen: recruiterWeeklyCheckin.avgTimeToScreen,
        delaysOrBottlenecks: recruiterWeeklyCheckin.delaysOrBottlenecks,
        concernsOrEscalations: recruiterWeeklyCheckin.concernsOrEscalations,
        supportNeeded: recruiterWeeklyCheckin.supportNeeded,
        createdAt: recruiterWeeklyCheckin.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(recruiterWeeklyCheckin)
      .leftJoin(user, eq(recruiterWeeklyCheckin.userId, user.id))
      .orderBy(desc(recruiterWeeklyCheckin.createdAt));

    const total = allResults.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedResults = allResults.slice(offset, offset + limit);

    return { checkins: paginatedResults, total };
  } catch (error) {
    console.error("Error fetching weekly check-ins", error);
    return { checkins: [], total: 0 };
  }
};
