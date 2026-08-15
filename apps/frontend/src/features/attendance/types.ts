export type MeetParticipantKind =
  | "signedin"
  | "anonymous"
  | "phone"
  | "unknown";

export type MeetAttendeeInput = {
  displayName: string;
  userId: string | null;
  kind: MeetParticipantKind;
  earliestStartTime: string | null;
  latestEndTime: string | null;
  totalDurationMs: number | null;
};

export type MeetConferenceInput = {
  id: string;
  name: string;
  title: string;
  meetingCode: string | null;
  space: string | null;
  startTime: string | null;
  endTime: string | null;
  participants: MeetAttendeeInput[];
};

export type StoredAttendanceRow = {
  id: string;
  attendanceDate: string;
  conferenceId: string;
  meetingTitle: string;
  meetingCode: string | null;
  displayName: string;
  kind: MeetParticipantKind;
  joinedAt: string | null;
  leftAt: string | null;
  durationMs: number | null;
};
