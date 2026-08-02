import type { PrismicMember } from "~/lib/prismic/member";
import { matchMemberByName } from "~/lib/attendance/match-member-by-name";
import type {
  MeetAttendanceConference,
  MeetAttendanceParticipant,
} from "~/lib/attendance/meet-attendance";

export type MeetAttendanceMatchResult =
  | {
      status: "matched";
      prismicUid: string;
      memberName: string;
      displayName: string;
    }
  | { status: "not_found"; displayName: string }
  | {
      status: "ambiguous";
      displayName: string;
      matches: Array<{ uid: string; name: string }>;
    }
  | { status: "skipped"; displayName: string; reason: string };

export type AggregatedMeetAttendance = {
  prismicUid: string;
  memberName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  meetingTitles: string[];
};

type AggregateDraft = {
  prismicUid: string;
  memberName: string;
  joinMs: number | null;
  leaveMs: number | null;
  meetingTitles: string[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Convert ISO timestamp to local `HH:mm` for `<input type="time">`. */
export function isoToLocalHm(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function attendanceDateFromStart(startTime: string | null): string {
  if (!startTime) return new Date().toISOString().slice(0, 10);
  const ms = Date.parse(startTime);
  if (Number.isNaN(ms)) return new Date().toISOString().slice(0, 10);
  return new Date(ms).toISOString().slice(0, 10);
}

function shouldSkipParticipant(participant: MeetAttendanceParticipant): boolean {
  const name = participant.displayName.trim();
  if (!name) return true;
  if (participant.kind === "anonymous" && /^anonymous$/i.test(name)) {
    return true;
  }
  if (participant.kind === "phone" && /^phone user$/i.test(name)) {
    return true;
  }
  if (participant.kind === "unknown" && /^unknown$/i.test(name)) {
    return true;
  }
  return false;
}

export function matchParticipantToMember(
  members: PrismicMember[],
  participant: MeetAttendanceParticipant,
): MeetAttendanceMatchResult {
  if (shouldSkipParticipant(participant)) {
    return {
      status: "skipped",
      displayName: participant.displayName,
      reason: "generic guest name",
    };
  }

  const match = matchMemberByName(members, participant.displayName);
  switch (match.status) {
    case "matched":
      return {
        status: "matched",
        prismicUid: match.member.uid,
        memberName: match.member.name,
        displayName: participant.displayName,
      };
    case "not_found":
      return { status: "not_found", displayName: participant.displayName };
    case "ambiguous":
      return {
        status: "ambiguous",
        displayName: participant.displayName,
        matches: match.matches.map((m) => ({ uid: m.uid, name: m.name })),
      };
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}

/**
 * Aggregate Meet participants across conferences into one attendance row
 * per Prismic member for a calendar date (earliest join / latest leave).
 */
export function aggregateMeetAttendance(
  conferences: MeetAttendanceConference[],
  members: PrismicMember[],
): {
  byUid: Map<string, AggregatedMeetAttendance>;
  unmatched: string[];
  ambiguous: Array<{ displayName: string; matches: string[] }>;
  skipped: number;
  attendanceDate: string;
} {
  const drafts = new Map<string, AggregateDraft>();
  const unmatched = new Set<string>();
  const ambiguous: Array<{ displayName: string; matches: string[] }> = [];
  let skipped = 0;
  let attendanceDate =
    conferences[0] != null
      ? attendanceDateFromStart(conferences[0].startTime)
      : new Date().toISOString().slice(0, 10);

  for (const conference of conferences) {
    if (conference.startTime) {
      attendanceDate = attendanceDateFromStart(conference.startTime);
    }

    for (const participant of conference.participants) {
      const result = matchParticipantToMember(members, participant);
      switch (result.status) {
        case "skipped":
          skipped += 1;
          break;
        case "not_found":
          unmatched.add(result.displayName);
          break;
        case "ambiguous":
          ambiguous.push({
            displayName: result.displayName,
            matches: result.matches.map((m) => m.name),
          });
          break;
        case "matched": {
          const joinParsed = participant.earliestStartTime
            ? Date.parse(participant.earliestStartTime)
            : Number.NaN;
          const leaveParsed = participant.latestEndTime
            ? Date.parse(participant.latestEndTime)
            : Number.NaN;
          const joinMs = Number.isNaN(joinParsed) ? null : joinParsed;
          const leaveMs = Number.isNaN(leaveParsed) ? null : leaveParsed;

          const existing = drafts.get(result.prismicUid);
          if (!existing) {
            drafts.set(result.prismicUid, {
              prismicUid: result.prismicUid,
              memberName: result.memberName,
              joinMs,
              leaveMs,
              meetingTitles: [conference.title],
            });
          } else {
            if (
              joinMs !== null &&
              (existing.joinMs === null || joinMs < existing.joinMs)
            ) {
              existing.joinMs = joinMs;
            }
            if (
              leaveMs !== null &&
              (existing.leaveMs === null || leaveMs > existing.leaveMs)
            ) {
              existing.leaveMs = leaveMs;
            }
            if (!existing.meetingTitles.includes(conference.title)) {
              existing.meetingTitles.push(conference.title);
            }
          }
          break;
        }
        default: {
          const _exhaustive: never = result;
          void _exhaustive;
        }
      }
    }
  }

  const byUid = new Map<string, AggregatedMeetAttendance>();
  for (const draft of drafts.values()) {
    byUid.set(draft.prismicUid, {
      prismicUid: draft.prismicUid,
      memberName: draft.memberName,
      checkInTime:
        draft.joinMs !== null
          ? isoToLocalHm(new Date(draft.joinMs).toISOString())
          : null,
      checkOutTime:
        draft.leaveMs !== null
          ? isoToLocalHm(new Date(draft.leaveMs).toISOString())
          : null,
      meetingTitles: draft.meetingTitles,
    });
  }

  return {
    byUid,
    unmatched: Array.from(unmatched).sort(),
    ambiguous,
    skipped,
    attendanceDate,
  };
}
