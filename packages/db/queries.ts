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
} from "./schema";
import { eq, asc, inArray, and } from "drizzle-orm";

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
 *
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
