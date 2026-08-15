/**
 * Dashboard · Employees · Weekly check-in module — owns the aggregate dashboard
 * reads and admin/employee lists (moved out of the legacy queries.ts monolith).
 */
import { db } from "@workspace/db/db";
import {
  candidate,
  application,
  position,
  interview,
  user,
  employee,
  recruiterWeeklyCheckin,
  roundTemplate,
} from "../schema";
import { applicationActivePipelineStatuses } from "../application-status";
import {
  eq,
  and,
  inArray,
  asc,
  desc,
  sql,
} from "drizzle-orm";
import { jsonArrayOverlap } from "../sqlite-helpers";
export const getDashboardStats = async () => {
  try {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

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

    const activePipelineStatuses = applicationActivePipelineStatuses;

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
        avgRating: sql<number>`AVG(${interview.rating})`,
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
      .innerJoin(roundTemplate, eq(interview.roundId, roundTemplate.id))
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
      .innerJoin(roundTemplate, eq(interview.roundId, roundTemplate.id))
      .leftJoin(user, eq(interview.interviewerId, user.id))
      .where(
        and(
          eq(interview.status, "pending"),
          sql`${interview.scheduledAt} >= ${Date.now()}`,
        ),
      )
      .orderBy(asc(interview.scheduledAt));

    if (limit) {
      // SAFETY: limit() returns the same select query builder type; the
      // reassignment needs the self-reference cast.
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

export const getApplicationsOverTime = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoMs = sixMonthsAgo.getTime();
    const monthExpr = sql<string>`strftime('%Y-%m', datetime(${application.createdAt} / 1000, 'unixepoch'))`;

    const results = await db
      .select({
        month: monthExpr,
        count: sql<number>`count(*)`,
      })
      .from(application)
      .where(sql`${application.createdAt} >= ${sixMonthsAgoMs}`)
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
      // SAFETY: where() returns the same select query builder type; the
      // reassignment needs the self-reference cast.
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
