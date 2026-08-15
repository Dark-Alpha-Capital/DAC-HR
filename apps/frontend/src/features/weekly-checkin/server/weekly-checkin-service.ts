import { db } from "@workspace/db/db";
import { recruiterWeeklyCheckin } from "@workspace/db/schema";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import { getWeeklyCheckins } from "@workspace/db/modules/dashboard";
import { getPositions } from "@workspace/db/modules/positions";
import { hasWeeklyCheckinViewerAccess } from "../constants";
import {
  weeklyCheckinFormSchema,
  type WeeklyCheckinFormSchema,
} from "../schemas";

type Actor = {
  id: string;
  email: string | null;
  name: string | null;
};

export const weeklyCheckinService = {
  async getForm(user: Actor) {
    if (!hasWeeklyCheckinViewerAccess(user.email)) {
      return { accessDenied: true as const };
    }

    const { positions } = await getPositions();

    return {
      accessDenied: false as const,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      userName: user.name || undefined,
    };
  },

  async getRecords(user: Actor, page?: number) {
    const hasAccess = hasWeeklyCheckinViewerAccess(user.email);
    if (!hasAccess) {
      return { accessDenied: true as const };
    }

    const currentPage = page ?? 1;
    const limit = 50;

    const [{ checkins, total }, { positions }] = await Promise.all([
      getWeeklyCheckins(currentPage, limit),
      getPositions(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const positionMap = Object.fromEntries(
      positions.map((p) => [p.id, p.name]),
    );

    return {
      accessDenied: false as const,
      checkins,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      positionMap,
    };
  },

  async create(data: WeeklyCheckinFormSchema, actor: Actor) {
    const parsed = weeklyCheckinFormSchema.safeParse(data);

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid form data" };
    }

    const validData = parsed.data;

    try {
      const [newCheckin] = await db
        .insert(recruiterWeeklyCheckin)
        .values({
          userId: actor.id,
          weekStartDate: validData.weekStartDate,
          weekEndDate: validData.weekEndDate,
          recruiterName: validData.recruiterName,
          positionsWorked: validData.positionsWorked,
          candidatesSourced: validData.candidatesSourced,
          candidatesScreened: validData.candidatesScreened,
          candidatesRejected: validData.candidatesRejected,
          candidatesAdvanced2ndRound: validData.candidatesAdvanced2ndRound,
          candidatesAdvanced3rdRound: validData.candidatesAdvanced3rdRound,
          offersExtended: validData.offersExtended,
          offersAccepted: validData.offersAccepted,
          bestPerformingChannels: validData.bestPerformingChannels,
          avgTimeToScreen: validData.avgTimeToScreen || null,
          delaysOrBottlenecks: validData.delaysOrBottlenecks || null,
          concernsOrEscalations: validData.concernsOrEscalations || null,
          supportNeeded: validData.supportNeeded || null,
        })
        .returning();

      if (!newCheckin) {
        return { error: "Failed to create weekly check-in" };
      }

      insertAuditLog({
        userId: actor.id,
        action: "create_weekly_checkin",
        entityType: "recruiter_weekly_checkin",
        entityId: newCheckin.id,
        details: {
          checkin: {
            id: newCheckin.id,
            weekStartDate: newCheckin.weekStartDate.toISOString(),
            weekEndDate: newCheckin.weekEndDate.toISOString(),
            recruiterName: newCheckin.recruiterName,
            positionsWorked: newCheckin.positionsWorked,
            candidatesSourced: newCheckin.candidatesSourced,
            candidatesScreened: newCheckin.candidatesScreened,
            candidatesRejected: newCheckin.candidatesRejected,
            candidatesAdvanced2ndRound: newCheckin.candidatesAdvanced2ndRound,
            candidatesAdvanced3rdRound: newCheckin.candidatesAdvanced3rdRound,
            offersExtended: newCheckin.offersExtended,
            offersAccepted: newCheckin.offersAccepted,
            bestPerformingChannels: newCheckin.bestPerformingChannels,
          },
          createdBy: {
            id: actor.id,
            email: actor.email,
            name: actor.name,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      }).catch((error) => console.error("Audit log error:", error));

      return { success: true, data: newCheckin };
    } catch (error) {
      console.error("Error creating weekly check-in", error);

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Failed to create weekly check-in" };
    }
  },
};
