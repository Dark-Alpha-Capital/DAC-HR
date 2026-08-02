import { expect, test } from "bun:test";
import {
  aggregateMeetAttendance,
  isoToLocalHm,
  matchParticipantToMember,
} from "~/lib/attendance/meet-attendance-aggregate";
import type { MeetAttendanceConference } from "~/lib/attendance/meet-attendance";
import type { PrismicMember } from "~/lib/prismic/member";

function member(
  overrides: Partial<PrismicMember> & Pick<PrismicMember, "name" | "uid">,
): PrismicMember {
  return {
    id: overrides.id ?? "id",
    kind: overrides.kind ?? "team",
    level: null,
    designation: null,
    title: null,
    department: null,
    role: null,
    bio: null,
    photoUrl: null,
    linkedInUrl: null,
    phoneNumber: null,
    resumeUrl: null,
    calendlyUrl: null,
    ...overrides,
  };
}

test("isoToLocalHm returns null for invalid input", () => {
  expect(isoToLocalHm(null)).toBeNull();
  expect(isoToLocalHm("not-a-date")).toBeNull();
});

test("matchParticipantToMember skips generic anonymous names", () => {
  const result = matchParticipantToMember(
    [member({ uid: "jack", name: "Jack Nicholson" })],
    {
      name: "p1",
      displayName: "Anonymous",
      kind: "anonymous",
      userId: null,
      earliestStartTime: null,
      latestEndTime: null,
      sessionCount: 1,
      totalDurationMs: null,
    },
  );
  expect(result.status).toBe("skipped");
});

test("aggregateMeetAttendance marks earliest join and latest leave", () => {
  const members = [member({ uid: "jack", name: "Jack Nicholson" })];
  const conferences: MeetAttendanceConference[] = [
    {
      id: "c1",
      name: "conferenceRecords/c1",
      title: "Standup",
      startTime: "2026-08-02T14:00:00.000Z",
      endTime: "2026-08-02T14:30:00.000Z",
      space: null,
      meetingCode: "abc-defg-hij",
      participantCount: 1,
      participants: [
        {
          name: "p1",
          displayName: "Jack Nicholson",
          kind: "signedin",
          userId: "users/1",
          earliestStartTime: "2026-08-02T14:05:00.000Z",
          latestEndTime: "2026-08-02T14:25:00.000Z",
          sessionCount: 1,
          totalDurationMs: 20 * 60 * 1000,
        },
      ],
    },
    {
      id: "c2",
      name: "conferenceRecords/c2",
      title: "1:1",
      startTime: "2026-08-02T16:00:00.000Z",
      endTime: "2026-08-02T17:00:00.000Z",
      space: null,
      meetingCode: null,
      participantCount: 1,
      participants: [
        {
          name: "p2",
          displayName: "Jack Nicholson",
          kind: "signedin",
          userId: "users/1",
          earliestStartTime: "2026-08-02T16:00:00.000Z",
          latestEndTime: "2026-08-02T16:45:00.000Z",
          sessionCount: 1,
          totalDurationMs: 45 * 60 * 1000,
        },
      ],
    },
  ];

  const result = aggregateMeetAttendance(conferences, members);
  expect(result.byUid.size).toBe(1);
  const row = result.byUid.get("jack");
  expect(row).toBeDefined();
  expect(row!.meetingTitles).toEqual(["Standup", "1:1"]);
  expect(row!.checkInTime).toBe(
    isoToLocalHm("2026-08-02T14:05:00.000Z"),
  );
  expect(row!.checkOutTime).toBe(
    isoToLocalHm("2026-08-02T16:45:00.000Z"),
  );
  expect(result.unmatched).toEqual([]);
});
