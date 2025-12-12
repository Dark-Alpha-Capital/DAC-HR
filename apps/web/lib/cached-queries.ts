import { cacheLife, cacheTag } from "next/cache";
import * as queries from "@workspace/db/queries";

// ============================================================================
// POSITIONS - Static/Configuration Data
// ============================================================================

export async function getPositions(
  hireLevels?: string[],
  statuses?: string[]
) {
  "use cache";
  cacheLife("days");
  cacheTag("positions");

  console.log("🔍 [CACHE MISS] getPositions executed", {
    timestamp: new Date().toISOString(),
    filters: { hireLevels, statuses },
  });

  return queries.getPositions(hireLevels, statuses);
}

export async function getPositionBySlug(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("positions");

  console.log("🔍 [CACHE MISS] getPositionBySlug executed", {
    timestamp: new Date().toISOString(),
    slug,
  });

  return queries.getPositionBySlug(slug);
}

// ============================================================================
// CANDIDATES - Semi-Static Data
// ============================================================================

export async function getCandidates() {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

  console.log("🔍 [CACHE MISS] getCandidates executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getCandidates();
}

export async function getCandidatesWithPositions() {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates", "positions");

  console.log("🔍 [CACHE MISS] getCandidatesWithPositions executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getCandidatesWithPositions();
}

export async function getCandidatesWithPositionsFiltered(
  nameSearch?: string,
  emailSearch?: string,
  positionIds?: string[],
  page: number = 1,
  limit: number = 50
) {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates", "positions");

  console.log("🔍 [CACHE MISS] getCandidatesWithPositionsFiltered executed", {
    timestamp: new Date().toISOString(),
    filters: { nameSearch, emailSearch, positionIds, page, limit },
  });

  return queries.getCandidatesWithPositionsFiltered(
    nameSearch,
    emailSearch,
    positionIds,
    page,
    limit
  );
}

export async function getCandidateById(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates");

  console.log("🔍 [CACHE MISS] getCandidateById executed", {
    timestamp: new Date().toISOString(),
    candidateId: id,
  });

  return queries.getCandidateById(id);
}

export async function getCandidateWithApplications(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates", "applications");

  console.log("🔍 [CACHE MISS] getCandidateWithApplications executed", {
    timestamp: new Date().toISOString(),
    candidateId: id,
  });

  return queries.getCandidateWithApplications(id);
}

export async function getCandidatesByPositionId(positionId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("candidates", "positions");

  console.log("🔍 [CACHE MISS] getCandidatesByPositionId executed", {
    timestamp: new Date().toISOString(),
    positionId,
  });

  return queries.getCandidatesByPositionId(positionId);
}

// ============================================================================
// APPLICATIONS - Dynamic Data
// ============================================================================

export async function getAllApplications() {
  "use cache";
  cacheLife("minutes");
  cacheTag("applications", "candidates", "positions");

  console.log("🔍 [CACHE MISS] getAllApplications executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getAllApplications();
}

export async function getApplicationById(applicationId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("applications");

  console.log("🔍 [CACHE MISS] getApplicationById executed", {
    timestamp: new Date().toISOString(),
    applicationId,
  });

  return queries.getApplicationById(applicationId);
}

export async function getApplicationWithInterviews(applicationId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("applications", "interviews");

  console.log("🔍 [CACHE MISS] getApplicationWithInterviews executed", {
    timestamp: new Date().toISOString(),
    applicationId,
  });

  return queries.getApplicationWithInterviews(applicationId);
}

export async function getApplicationsOverTime() {
  "use cache";
  cacheLife("hours");
  cacheTag("applications", "analytics");

  console.log("🔍 [CACHE MISS] getApplicationsOverTime executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getApplicationsOverTime();
}

// ============================================================================
// INTERVIEWS - Dynamic Data
// ============================================================================

export async function getInterviewsByApplicationId(applicationId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("interviews");

  console.log("🔍 [CACHE MISS] getInterviewsByApplicationId executed", {
    timestamp: new Date().toISOString(),
    applicationId,
  });

  return queries.getInterviewsByApplicationId(applicationId);
}

export async function getInterviewById(interviewId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("interviews");

  console.log("🔍 [CACHE MISS] getInterviewById executed", {
    timestamp: new Date().toISOString(),
    interviewId,
  });

  return queries.getInterviewById(interviewId);
}

export async function getUpcomingInterviews(limit?: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag("interviews");

  console.log("🔍 [CACHE MISS] getUpcomingInterviews executed", {
    timestamp: new Date().toISOString(),
    limit,
  });

  return queries.getUpcomingInterviews(limit);
}

export async function getInterviewRatingsDistribution() {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews", "analytics");

  console.log("🔍 [CACHE MISS] getInterviewRatingsDistribution executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getInterviewRatingsDistribution();
}

export async function getInterviewStatusDistribution() {
  "use cache";
  cacheLife("hours");
  cacheTag("interviews", "analytics");

  console.log("🔍 [CACHE MISS] getInterviewStatusDistribution executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getInterviewStatusDistribution();
}

// ============================================================================
// QUESTIONS & ROUNDS - Static/Configuration Data
// ============================================================================

export async function getQuestions() {
  "use cache";
  cacheLife("days");
  cacheTag("questions");

  console.log("🔍 [CACHE MISS] getQuestions executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getQuestions();
}

export async function getQuestionsWithRounds() {
  "use cache";
  cacheLife("days");
  cacheTag("questions", "rounds");

  console.log("🔍 [CACHE MISS] getQuestionsWithRounds executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getQuestionsWithRounds();
}

export async function getQuestionById(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("questions");

  console.log("🔍 [CACHE MISS] getQuestionById executed", {
    timestamp: new Date().toISOString(),
    questionId: id,
  });

  return queries.getQuestionById(id);
}

export async function getQuestionsByRoundId(roundId: string) {
  "use cache";
  cacheLife("days");
  cacheTag("questions", "rounds");

  console.log("🔍 [CACHE MISS] getQuestionsByRoundId executed", {
    timestamp: new Date().toISOString(),
    roundId,
  });

  return queries.getQuestionsByRoundId(roundId);
}

export async function getRounds() {
  "use cache";
  cacheLife("days");
  cacheTag("rounds");

  console.log("🔍 [CACHE MISS] getRounds executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getRounds();
}

export async function getRoundsWithPositions(positionIds?: string[]) {
  "use cache";
  cacheLife("days");
  cacheTag("rounds", "positions");

  console.log("🔍 [CACHE MISS] getRoundsWithPositions executed", {
    timestamp: new Date().toISOString(),
    positionIds,
  });

  return queries.getRoundsWithPositions(positionIds);
}

export async function getRoundsByPositionId(positionId: string) {
  "use cache";
  cacheLife("days");
  cacheTag("rounds", "positions");

  console.log("🔍 [CACHE MISS] getRoundsByPositionId executed", {
    timestamp: new Date().toISOString(),
    positionId,
  });

  return queries.getRoundsByPositionId(positionId);
}

export async function getRoundById(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("rounds");

  console.log("🔍 [CACHE MISS] getRoundById executed", {
    timestamp: new Date().toISOString(),
    roundId: id,
  });

  return queries.getRoundById(id);
}

export async function getPositionRoundTemplateById(
  positionRoundTemplateId: string
) {
  "use cache";
  cacheLife("days");
  cacheTag("rounds", "positions");

  console.log("🔍 [CACHE MISS] getPositionRoundTemplateById executed", {
    timestamp: new Date().toISOString(),
    positionRoundTemplateId,
  });

  return queries.getPositionRoundTemplateById(positionRoundTemplateId);
}

// ============================================================================
// DOCUMENTS - Semi-Static Data
// ============================================================================

export async function getDocuments(
  categoryFilters?: string[],
  nameSearch?: string,
  tagsSearch?: string
) {
  "use cache";
  cacheLife("hours");
  cacheTag("documents");

  console.log("🔍 [CACHE MISS] getDocuments executed", {
    timestamp: new Date().toISOString(),
    filters: { categoryFilters, nameSearch, tagsSearch },
  });

  return queries.getDocuments(categoryFilters, nameSearch, tagsSearch);
}

export async function getDocumentsByCandidateId(candidateId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("documents", "candidates");

  console.log("🔍 [CACHE MISS] getDocumentsByCandidateId executed", {
    timestamp: new Date().toISOString(),
    candidateId,
  });

  return queries.getDocumentsByCandidateId(candidateId);
}

// ============================================================================
// EMPLOYEES - Semi-Static Data
// ============================================================================

export async function getEmployees(
  positionIds?: string[],
  departments?: string[]
) {
  "use cache";
  cacheLife("hours");
  cacheTag("employees");

  console.log("🔍 [CACHE MISS] getEmployees executed", {
    timestamp: new Date().toISOString(),
    filters: { positionIds, departments },
  });

  return queries.getEmployees(positionIds, departments);
}

export async function getEmployeeById(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("employees");

  console.log("🔍 [CACHE MISS] getEmployeeById executed", {
    timestamp: new Date().toISOString(),
    employeeId: id,
  });

  return queries.getEmployeeById(id);
}

export async function getEmployeesByDepartment() {
  "use cache";
  cacheLife("hours");
  cacheTag("employees", "analytics");

  console.log("🔍 [CACHE MISS] getEmployeesByDepartment executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getEmployeesByDepartment();
}

// ============================================================================
// DASHBOARD & ANALYTICS - Frequently Changing Data
// ============================================================================

export async function getDashboardStats() {
  "use cache";
  cacheLife("minutes");
  cacheTag("dashboard", "analytics");

  console.log("🔍 [CACHE MISS] getDashboardStats executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getDashboardStats();
}

export async function getCandidatesByStatus() {
  "use cache";
  cacheLife("minutes");
  cacheTag("candidates", "analytics");

  console.log("🔍 [CACHE MISS] getCandidatesByStatus executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getCandidatesByStatus();
}

export async function getCandidatesByPosition() {
  "use cache";
  cacheLife("minutes");
  cacheTag("candidates", "positions", "analytics");

  console.log("🔍 [CACHE MISS] getCandidatesByPosition executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getCandidatesByPosition();
}

export async function getRecentActivity(limit: number = 10) {
  "use cache";
  cacheLife("minutes");
  cacheTag("dashboard", "analytics");

  console.log("🔍 [CACHE MISS] getRecentActivity executed", {
    timestamp: new Date().toISOString(),
    limit,
  });

  return queries.getRecentActivity(limit);
}

// ============================================================================
// USERS - Static Data
// ============================================================================

export async function getUsers() {
  "use cache";
  cacheLife("hours");
  cacheTag("users");

  console.log("🔍 [CACHE MISS] getUsers executed", {
    timestamp: new Date().toISOString(),
  });

  return queries.getUsers();
}

// ============================================================================
// CANDIDATE ONBOARDING - Dynamic Data
// ============================================================================

export async function getCandidateOnboarding(candidateId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("onboarding", "candidates");

  console.log("🔍 [CACHE MISS] getCandidateOnboarding executed", {
    timestamp: new Date().toISOString(),
    candidateId,
  });

  return queries.getCandidateOnboarding(candidateId);
}

export async function getOrCreateCandidateOnboarding(candidateId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("onboarding", "candidates");

  console.log("🔍 [CACHE MISS] getOrCreateCandidateOnboarding executed", {
    timestamp: new Date().toISOString(),
    candidateId,
  });

  return queries.getOrCreateCandidateOnboarding(candidateId);
}
