/**
 * Positions · Rounds · Questions module — owns all position/round/question
 * reads (bound D1 query layer for positions/rounds/questions).
 */
import { db } from "@workspace/db/db";
import {
  position,
  roundTemplate,
  roundTemplateQuestions,
  questionBank,
  candidate,
  candidatePosition,
} from "../schema";
import { eq, and, or, inArray, asc } from "drizzle-orm";
import { ilike } from "../sqlite-helpers";
import {
  hireLevels as hireLevelValues,
  positionStatuses as positionStatusValues,
} from "../enums";
export const getPositions = async (
  hireLevels?: string[],
  statuses?: string[],
  page: number = 1,
  limit: number = 50,
  search?: string,
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
        (level): level is (typeof hireLevelValues)[number] =>
          // SAFETY: `hireLevelValues` is a string-literal array; widening to
          // `readonly string[]` lets us search it with an arbitrary string.
          (hireLevelValues as readonly string[]).includes(level),
      );
      if (validHireLevels.length > 0) {
        conditions.push(inArray(position.hireLevel, validHireLevels));
      }
    }

    // Apply status filter if provided
    if (statuses && statuses.length > 0) {
      // Validate statuses against enum values
      const validStatuses = statuses.filter(
        (status): status is (typeof positionStatusValues)[number] =>
          // SAFETY: `positionStatusValues` is a string-literal array; widening
          // to `readonly string[]` lets us search it with an arbitrary string.
          (positionStatusValues as readonly string[]).includes(status),
      );
      if (validStatuses.length > 0) {
        conditions.push(inArray(position.status, validStatuses));
      }
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(position.name, searchTerm),
          ilike(position.description, searchTerm),
        )!,
      );
    }

    // Apply all conditions with AND
    if (conditions.length > 0) {
      // SAFETY: where() returns the same select query builder type; the
      // reassignment needs the self-reference cast.
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
        .select({ roundId: roundTemplate.id })
        .from(roundTemplate)
        .where(inArray(roundTemplate.positionId, positionIds));

      filteredRoundIds = matchingRounds.map((r) => r.roundId);

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
      .innerJoin(position, eq(roundTemplate.positionId, position.id))
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
    return await db
      .select({
        id: roundTemplate.id,
        name: roundTemplate.name,
        description: roundTemplate.description,
        createdAt: roundTemplate.createdAt,
        updatedAt: roundTemplate.updatedAt,
        positionId: roundTemplate.positionId,
      })
      .from(roundTemplate)
      .where(eq(roundTemplate.positionId, positionId));
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
        positionId: roundTemplate.positionId,
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
 * Returns the position that owns a round.
 */

export const getPositionIdForRound = async (
  roundId: string,
): Promise<string> => {
  try {
    const [result] = await db
      .select({ positionId: roundTemplate.positionId })
      .from(roundTemplate)
      .where(eq(roundTemplate.id, roundId))
      .limit(1);

    return result?.positionId ?? "";
  } catch (error) {
    console.error("Error fetching position for round", error);
    return "";
  }
};

/** @deprecated Use getPositionIdForRound */

export const getFirstPositionIdForRoundTemplate = getPositionIdForRound;

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
      .from(roundTemplate)
      .innerJoin(position, eq(roundTemplate.positionId, position.id))
      .where(eq(roundTemplate.id, roundId));

    return results;
  } catch (error) {
    console.error("Error fetching positions by round id", error);
    return [];
  }
};

/**
 * Fetches an application by ID with full details including position and rounds
 * @param applicationId The ID of the application
 * @returns The application with position and round details or null if not found
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
    questionType: string;
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
        questionType: questionBank.questionType,
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
      .leftJoin(position, eq(roundTemplate.positionId, position.id));

    // Group questions by question ID and collect rounds and positions
    const questionsMap = new Map<
      string,
      {
        id: string;
        questionText: string;
        questionType: string;
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
          questionType: result.questionType,
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
        questionType: questionBank.questionType,
        options: questionBank.options,
        createdAt: questionBank.createdAt,
        updatedAt: questionBank.updatedAt,
      })
      .from(roundTemplateQuestions)
      .innerJoin(
        questionBank,
        eq(roundTemplateQuestions.questionId, questionBank.id),
      )
      .where(eq(roundTemplateQuestions.roundTemplateId, roundId))
      .orderBy(asc(questionBank.orderIndex), asc(questionBank.createdAt));

    return results;
  } catch (error) {
    console.error("Error fetching questions by round id", error);
    return [];
  }
};

export const getQuestionsForInterviewSession = async (roundId: string) => {
  try {
    return await db
      .select({
        id: questionBank.id,
        questionText: questionBank.questionText,
        questionType: questionBank.questionType,
        category: questionBank.category,
        options: questionBank.options,
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
      )
      .orderBy(asc(questionBank.orderIndex), asc(questionBank.createdAt));
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
