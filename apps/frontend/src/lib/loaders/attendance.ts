import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { createPrismicClient } from "~/lib/prismic/client";
import { getTeamMemberType, getOperatingMemberType } from "~/lib/prismic/config";
import { toPrismicMember, type PrismicMember } from "~/lib/prismic/member";
import {
  getAttendanceByDate,
  getAttendanceMetadata,
} from "@workspace/db/repositories/attendance-repository";
import { getHolidayByDate } from "@workspace/db/repositories/holiday-repository";

type LoadAttendancePageInput = {
  date: string;
};

const ordering = [
  { field: "document.first_publication_date", direction: "asc" as const },
];

export const loadAttendancePage = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: LoadAttendancePageInput) => data)
  .handler(async ({ data }) => {
    const client = createPrismicClient();
    const teamType = getTeamMemberType();
    const operatingType = getOperatingMemberType();

    const [
      teamDocs,
      operatingDocs,
      attendanceMap,
      metadata,
      holiday,
    ] = await Promise.all([
      client
        .getAllByType(teamType, { orderings: ordering })
        .then((docs) => docs.map((doc) => toPrismicMember(doc, "team"))),
      client
        .getAllByType(operatingType, { orderings: ordering })
        .then((docs) => docs.map((doc) => toPrismicMember(doc, "operating"))),
      getAttendanceByDate(data.date),
      getAttendanceMetadata(data.date),
      getHolidayByDate(data.date),
    ]);

    const members: PrismicMember[] = [...teamDocs, ...operatingDocs];

    return {
      members,
      attendance: attendanceMap,
      date: data.date,
      isMarked: metadata.isMarked,
      markedBy: metadata.markedBy,
      markedAt: metadata.markedAt,
      holiday: holiday
        ? { id: holiday.id, name: holiday.name, description: holiday.description }
        : null,
    };
  });
