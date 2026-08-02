import { upsertAttendanceRecord } from "@workspace/db/repositories/attendance-repository";
import type { AggregatedMeetAttendance } from "~/lib/attendance/meet-attendance-aggregate";

function buildNotes(meetingTitles: string[]): string {
  const label = meetingTitles.filter(Boolean).join("; ");
  const notes = label ? `Meet: ${label}` : "Meet attendance sync";
  return notes.length > 500 ? `${notes.slice(0, 497)}...` : notes;
}

/** Upsert aggregated Meet matches into the recruiting `attendance` table. */
export async function persistAggregatedMeetAttendance(input: {
  aggregates: AggregatedMeetAttendance[];
  date: string;
  markedBy: string;
}): Promise<{ marked: number }> {
  let marked = 0;
  for (const row of input.aggregates) {
    await upsertAttendanceRecord(
      {
        prismicUid: row.prismicUid,
        date: input.date,
        status: "present",
        checkInTime: row.checkInTime,
        checkOutTime: row.checkOutTime,
        notes: buildNotes(row.meetingTitles),
      },
      input.markedBy,
    );
    marked += 1;
  }
  return { marked };
}
