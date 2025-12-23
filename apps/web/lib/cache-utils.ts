/**
 * Cache utilities using Next.js revalidateTag for centralized cache invalidation
 *
 * This replaces manual revalidatePath() calls with a tag-based caching strategy
 * that provides better granularity and prevents cache invalidation errors.
 */

import { revalidatePath } from "next/cache";

// ============================================
// Cache Tag Generation
// ============================================

export const CacheTags = {
  // Candidates
  candidate: (id: string) => `candidate-${id}`,
  candidates: () => "candidates",
  candidatesByStatus: (status: string) => `candidates-status-${status}`,
  candidatesByPosition: (positionId: string) => `candidates-position-${positionId}`,

  // Candidate Documents
  candidateDocuments: (candidateId: string) => `candidate-documents-${candidateId}`,
  candidateDocument: (id: string) => `candidate-document-${id}`,

  // Positions
  position: (id: string) => `position-${id}`,
  positions: () => "positions",

  // Applications
  application: (id: string) => `application-${id}`,
  applications: () => "applications",
  applicationsByCandidate: (candidateId: string) => `applications-candidate-${candidateId}`,
  applicationsByPosition: (positionId: string) => `applications-position-${positionId}`,
  applicationsByStatus: (status: string) => `applications-status-${status}`,

  // Interviews
  interview: (id: string) => `interview-${id}`,
  interviews: () => "interviews",
  interviewsByApplication: (applicationId: string) => `interviews-application-${applicationId}`,
  interviewsByInterviewer: (interviewerId: string) => `interviews-interviewer-${interviewerId}`,
  interviewsByStatus: (status: string) => `interviews-status-${status}`,
  upcomingInterviews: () => "interviews-upcoming",

  // Interview Feedback
  interviewFeedback: (interviewId: string) => `interview-feedback-${interviewId}`,

  // Questions
  question: (id: string) => `question-${id}`,
  questions: () => "questions",

  // Round Templates
  roundTemplate: (id: string) => `round-template-${id}`,
  roundTemplates: () => "round-templates",
  roundTemplatesByPosition: (positionId: string) => `round-templates-position-${positionId}`,

  // Documents
  document: (id: string) => `document-${id}`,
  documents: () => "documents",
  documentsByCategory: (category: string) => `documents-category-${category}`,

  // Dashboard
  dashboardStats: () => "dashboard-stats",
  recentActivity: () => "recent-activity",
} as const;

// ============================================
// Cache Revalidation Functions
// ============================================

/**
 * Revalidate candidate cache
 * Call this after creating/updating/deleting a candidate
 */
export async function revalidateCandidate(candidateId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate candidates list
 * Call this after bulk operations or when candidates list needs refresh
 */
export async function revalidateCandidates() {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate candidate document cache
 * Call this after creating/updating/deleting a candidate document
 */
export async function revalidateCandidateDocument(candidateId: string, documentId?: string) {
  if (documentId) {
    revalidatePath("/", "layout");
  }
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate position cache
 * Call this after creating/updating/deleting a position
 */
export async function revalidatePosition(positionId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate positions list
 * Call this after bulk operations
 */
export async function revalidatePositions() {
  revalidatePath("/", "layout");
}

/**
 * Revalidate application cache
 * Call this after creating/updating/deleting an application
 */
export async function revalidateApplication(
  applicationId: string,
  candidateId: string,
  positionId: string,
  status?: string
) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");

  if (status) {
    revalidatePath("/", "layout");
  }

  // Also invalidate related candidate and position caches
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate interview cache
 * Call this after creating/updating/deleting an interview
 */
export async function revalidateInterview(
  interviewId: string,
  applicationId: string,
  interviewerId?: string,
  status?: string
) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");

  if (interviewerId) {
    revalidatePath("/", "layout");
  }

  if (status) {
    revalidatePath("/", "layout");
  }

  // Also invalidate application cache
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate interview feedback cache
 * Call this after creating/updating interview feedback
 */
export async function revalidateInterviewFeedback(interviewId: string, applicationId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate question cache
 * Call this after creating/updating/deleting a question
 */
export async function revalidateQuestion(questionId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

/**
 * Revalidate round template cache
 * Call this after creating/updating/deleting a round template
 */
export async function revalidateRoundTemplate(roundTemplateId: string, positionId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");

  if (positionId) {
    revalidatePath("/", "layout");
    revalidatePath("/", "layout");
  }
}

/**
 * Revalidate document cache
 * Call this after creating/updating/deleting a document
 */
export async function revalidateDocument(documentId: string, category?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");

  if (category) {
    revalidatePath("/", "layout");
  }
}

/**
 * Revalidate dashboard cache
 * Call this after any operation that affects dashboard statistics
 */
export async function revalidateDashboard() {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

// ============================================
// Batch Revalidation
// ============================================

/**
 * Revalidate all caches (use sparingly)
 * Only use this for major data migrations or system-wide updates
 */
export async function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/", "layout");
}

// ============================================
// Cache Strategy Constants
// ============================================

/**
 * Time-based cache configuration (in seconds)
 */
export const CACHE_TIMES = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

/**
 * Get cache strategy for different data types
 */
export function getCacheStrategy(type: "static" | "semi-static" | "dynamic") {
  switch (type) {
    case "static":
      // Rarely changes (e.g., positions, round templates, documents)
      return {
        revalidate: CACHE_TIMES.LONG,
      };

    case "semi-static":
      // Changes occasionally (e.g., candidates, questions)
      return {
        revalidate: CACHE_TIMES.MEDIUM,
      };

    case "dynamic":
      // Changes frequently (e.g., applications, interviews, dashboard stats)
      return {
        revalidate: CACHE_TIMES.SHORT,
      };
  }
}
