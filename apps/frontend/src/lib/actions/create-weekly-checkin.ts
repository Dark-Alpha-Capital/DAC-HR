import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { recruiterWeeklyCheckin } from "@workspace/db/schema";
import { getSession } from "~/lib/get-session";
import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  weeklyCheckinFormSchema,
  type WeeklyCheckinFormSchema,
} from "~/lib/schemas/weekly-checkin-form-schema";

export const createWeeklyCheckin = createServerFn({ method: "POST" })
  .validator((data: WeeklyCheckinFormSchema) => data)
  .handler(async ({ data }) => {
  const session = await getSession();

  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  // Validate input
  const parsed = weeklyCheckinFormSchema.safeParse(data);


  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid form data" };
  }

  const validData = parsed.data;

  try {
    const [newCheckin] = await db
      .insert(recruiterWeeklyCheckin)
      .values({
        userId: session.user.id,
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
      userId: session.user.id,
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
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
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
});
