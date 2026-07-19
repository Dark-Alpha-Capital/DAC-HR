import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@workspace/db/db";
import type { AttendanceStatus } from "../enums";
import { attendance, user } from "../schema";

export const getAttendanceByDate = async (date: string) => {
  try {
    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.date, date));

    const byUid: Record<string, typeof records[number]> = {};
    for (const record of records) {
      byUid[record.prismicUid] = record;
    }
    return byUid;
  } catch (error) {
    console.error("Error fetching attendance by date", error);
    return {};
  }
};

export const getAttendanceForMember = async (
  prismicUid: string,
  startDate: string,
  endDate: string,
) => {
  try {
    return await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.prismicUid, prismicUid),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate),
        ),
      )
      .orderBy(attendance.date);
  } catch (error) {
    console.error("Error fetching attendance for member", error);
    return [];
  }
};

export const upsertAttendanceRecords = async (
  date: string,
  records: Array<{
    prismicUid: string;
    status: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    notes?: string | null;
  }>,
  markedBy: string,
) => {
  try {
    await db.delete(attendance).where(eq(attendance.date, date));

    if (records.length === 0) return [];

    const results = [];
    for (const record of records) {
      const [row] = await db
        .insert(attendance)
        .values({
          prismicUid: record.prismicUid,
          date,
          status: record.status as AttendanceStatus,
          checkInTime: record.checkInTime ?? null,
          checkOutTime: record.checkOutTime ?? null,
          notes: record.notes ?? null,
          markedBy,
        })
        .returning();
      if (row) results.push(row);
    }

    return results;
  } catch (error) {
    console.error("Error upserting attendance records", error);
    throw error;
  }
};

/** Upsert a single attendance row without wiping other records for the date. */
export const upsertAttendanceRecord = async (
  record: {
    prismicUid: string;
    date: string;
    status: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    notes?: string | null;
  },
  markedBy: string,
) => {
  try {
    const [row] = await db
      .insert(attendance)
      .values({
        prismicUid: record.prismicUid,
        date: record.date,
        status: record.status as AttendanceStatus,
        checkInTime: record.checkInTime ?? null,
        checkOutTime: record.checkOutTime ?? null,
        notes: record.notes ?? null,
        markedBy,
      })
      .onConflictDoUpdate({
        target: [attendance.prismicUid, attendance.date],
        set: {
          status: record.status as AttendanceStatus,
          checkInTime: record.checkInTime ?? null,
          checkOutTime: record.checkOutTime ?? null,
          notes: record.notes ?? null,
          markedBy,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row ?? null;
  } catch (error) {
    console.error("Error upserting attendance record", error);
    throw error;
  }
};

export const getAttendanceMetadata = async (date: string) => {
  try {
    const [record] = await db
      .select({
        markedBy: attendance.markedBy,
        userName: user.name,
        userEmail: user.email,
        markedAt: attendance.createdAt,
      })
      .from(attendance)
      .leftJoin(user, eq(attendance.markedBy, user.id))
      .where(eq(attendance.date, date))
      .limit(1);

    if (!record) return { isMarked: false, markedBy: null, markedAt: null };

    return {
      isMarked: true,
      markedBy: record.userName ?? record.userEmail ?? record.markedBy,
      markedAt: record.markedAt,
    };
  } catch (error) {
    console.error("Error fetching attendance metadata", error);
    return { isMarked: false, markedBy: null, markedAt: null };
  }
};
