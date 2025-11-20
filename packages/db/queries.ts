import { db } from "./index";
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
  candidateDocument,
  candidateOnboarding
} from "./schema";
import { eq, asc, inArray, and, sql } from "drizzle-orm";



/**
 *
 * Fetches all positions from the database
 * @returns An array of positions
 */
export const getPositions = async () => {
  try {
    return await db.select().from(position);
  } catch (error) {
    console.error("Error fetching positions", error);
    return [];
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
          result.application.id
        );
        return {
          ...result.application,
          candidate: result.candidate,
          position: result.position,
          interviews,
        };
      })
    );

    return applicationsWithInterviews;
  } catch (error) {
    console.error("Error fetching all applications", error);
    return [];
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
        eq(candidate.id, candidatePosition.candidateId)
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
      })
    );

    return {
      ...candidateResult,
      applications: applicationsWithInterviews,
    };
  } catch (error) {
    console.error("Error fetching candidate with applications", error);
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
 * Fetches all questions with their associated rounds and positions from the database
 * @returns An array of questions with round and position information
 */
export const getQuestionsWithRounds = async () => {
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
        eq(questionBank.id, roundTemplateQuestions.questionId)
      )
      .leftJoin(
        roundTemplate,
        eq(roundTemplateQuestions.roundTemplateId, roundTemplate.id)
      )
      .leftJoin(
        positionRoundTemplates,
        eq(roundTemplate.id, positionRoundTemplates.roundTemplateId)
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
        rounds: Array<{ id: string; name: string }>;
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
        // Check if round already added (avoid duplicates)
        if (!question.rounds.some((r) => r.id === result.roundId)) {
          question.rounds.push({
            id: result.roundId,
            name: result.roundName || "",
          });
        }
      }
      if (result.positionId) {
        // Check if position already added (avoid duplicates)
        if (!question.positions.some((p) => p.id === result.positionId)) {
          question.positions.push({
            id: result.positionId,
            name: result.positionName || "",
          });
        }
      }
    }

    return Array.from(questionsMap.values());
  } catch (error) {
    console.error("Error fetching questions with rounds", error);
    return [];
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
        eq(roundTemplateQuestions.questionId, questionBank.id)
      )
      .where(eq(roundTemplateQuestions.roundTemplateId, roundId));

    return results;
  } catch (error) {
    console.error("Error fetching questions by round id", error);
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
 * @returns An array of round templates with position information
 */
export const getRoundsWithPositions = async (positionIds?: string[]) => {
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
        return [];
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
        eq(roundTemplate.id, positionRoundTemplates.roundTemplateId)
      )
      .leftJoin(position, eq(positionRoundTemplates.positionId, position.id))
      .where(
        filteredRoundIds && filteredRoundIds.length > 0
          ? inArray(roundTemplate.id, filteredRoundIds)
          : undefined
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

    return Array.from(roundsMap.values());
  } catch (error) {
    console.error("Error fetching rounds with positions", error);
    return [];
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
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id)
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
 * Fetches a positionRoundTemplate by ID
 * @param positionRoundTemplateId The ID of the position round template
 * @returns The positionRoundTemplate or null if not found
 */
export const getPositionRoundTemplateById = async (
  positionRoundTemplateId: string
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
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id)
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
      appResult.application.positionId
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
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id)
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id)
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
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id)
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id)
      )
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(eq(interview.id, interviewId));

    if (!interviewResult) {
      return null;
    }

    // Get questions for this round template
    const questions = await getQuestionsByRoundId(
      interviewResult.roundTemplate.id
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
        eq(interviewFeedback.questionId, questionBank.id)
      )
      .where(eq(interviewFeedback.interviewId, interviewId));

    // Map questions with their feedback
    const questionsWithFeedback = questions.map((question) => {
      const feedback = feedbackResults.find(
        (f) => f.questionId === question.id
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
        eq(candidate.id, candidatePosition.candidateId)
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
 * @returns An array of documents
 */
export async function getDocuments() {
  try {
    const results = await db.select().from(documents);
    return results;
  } catch (error) {
    console.error("Error fetching documents", error);
    return [];
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
 * @returns Dashboard statistics object
 */
export const getDashboardStats = async () => {
  try {
    // Total candidates count
    const [totalCandidatesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(candidate);
    const totalCandidates = totalCandidatesResult?.count || 0;

    // Active candidates count (candidates with applications in reviewed, shortlisted, or interviewing status)
    const [activeCandidatesResult] = await db
      .select({
        count: sql<number>`count(DISTINCT ${application.candidateId})::int`,
      })
      .from(application)
      .where(
        sql`${application.status} IN ('reviewed', 'shortlisted', 'interviewing')`
      );
    const activeCandidates = activeCandidatesResult?.count || 0;

    // Interviews scheduled count (interviews with status 'pending')
    const [interviewsScheduledResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interview)
      .where(eq(interview.status, "pending"));
    const interviewsScheduled = interviewsScheduledResult?.count || 0;

    // Average time to hire (in days) - from application created to hired status
    const [avgTimeToHireResult] = await db
      .select({
        avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${application.updatedAt} - ${application.createdAt})) / 86400)::int`,
      })
      .from(application)
      .where(eq(application.status, "hired"));
    const avgTimeToHire = avgTimeToHireResult?.avgDays || 0;

    return {
      totalCandidates,
      activeCandidates,
      interviewsScheduled,
      avgTimeToHire,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats", error);
    return {
      totalCandidates: 0,
      activeCandidates: 0,
      interviewsScheduled: 0,
      avgTimeToHire: 0,
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
        count: sql<number>`count(DISTINCT ${application.candidateId})::int`,
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
        count: sql<number>`count(DISTINCT ${application.candidateId})::int`,
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
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id)
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id)
      )
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(
        and(
          eq(interview.status, "pending"),
          sql`${interview.scheduledAt} >= NOW()`
        )
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
        eq(interview.positionRoundTemplateId, positionRoundTemplates.id)
      )
      .innerJoin(
        roundTemplate,
        eq(positionRoundTemplates.roundTemplateId, roundTemplate.id)
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
  const [existingOnboarding] = await db
    .select()
    .from(candidateOnboarding)
    .where(eq(candidateOnboarding.candidateId, candidateId))
    .limit(1)
    .execute();

  if (existingOnboarding) {
    return existingOnboarding;
  }

  const [newOnboarding] = await db
    .insert(candidateOnboarding)
    .values({ candidateId })
    .returning()
    .execute();

  return newOnboarding;
};
