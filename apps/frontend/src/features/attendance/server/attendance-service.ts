import { insertAuditLog } from "@workspace/db/repositories/audit-repository";
import {
  listStoredAttendanceRows,
  persistConferenceAttendance,
  type MeetConferenceInput,
} from "@workspace/db/repositories/meet-attendance-repository";

export type { StoredAttendanceRow } from "@workspace/db/repositories/meet-attendance-repository";

// Audit log details are an arbitrary JSON payload recorded at audit time;
// values are JSON-serializable by construction.
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type AuditDetails = Record<string, JsonValue>;

type StoredRowsInput = {
  date?: string;
  page?: number;
};

export const attendanceService = {
  async persistConference(
    conference: MeetConferenceInput,
    syncedByUserId: string,
  ) {
    return persistConferenceAttendance({
      conference,
      syncedByUserId,
    });
  },

  async listStored(data: { date?: string; page?: number }) {
    const input: StoredRowsInput = {};
    if (data.date) input.date = data.date;
    if (data.page) input.page = data.page;
    return listStoredAttendanceRows(input);
  },

  async insertAudit(input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details: AuditDetails;
  }) {
    return insertAuditLog(input);
  },
};
