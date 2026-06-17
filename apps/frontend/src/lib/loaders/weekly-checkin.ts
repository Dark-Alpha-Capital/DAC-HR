import { createServerFn } from "@tanstack/react-start";
import { getPositions, getWeeklyCheckins } from "@workspace/db/queries";
import { getSession } from "~/lib/server/session.server";
import { hasWeeklyCheckinViewerAccess } from "~/lib/config/weekly-checkin-access";

export const loadWeeklyCheckinForm = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession();
    if (!session?.user) {
      return { unauthorized: true as const };
    }
    if (!hasWeeklyCheckinViewerAccess(session.user.email)) {
      return { accessDenied: true as const };
    }

    const { positions } = await getPositions();

    return {
      unauthorized: false as const,
      accessDenied: false as const,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      userName: session.user.name || undefined,
    };
  },
);

type WeeklyCheckinRecordsInput = {
  page?: number;
};

export const loadWeeklyCheckinRecords = createServerFn({ method: "GET" })
  .validator((data: WeeklyCheckinRecordsInput) => data)
  .handler(async ({ data: deps }) => {
    const session = await getSession();
    if (!session?.user) {
      return { unauthorized: true as const };
    }

    const hasAccess = hasWeeklyCheckinViewerAccess(session.user.email);
    if (!hasAccess) {
      return { unauthorized: false as const, accessDenied: true as const };
    }

    const currentPage = deps.page ?? 1;
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
      unauthorized: false as const,
      accessDenied: false as const,
      checkins,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      positionMap,
    };
  });
