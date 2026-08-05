import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import { getPositions } from "@workspace/db/modules/positions";
import { getWeeklyCheckins } from "@workspace/db/modules/dashboard";
import { hasWeeklyCheckinViewerAccess } from "~/lib/config/weekly-checkin-access";

export const loadWeeklyCheckinForm = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async ({ context: { session } }) => {
    if (!hasWeeklyCheckinViewerAccess(session.user.email)) {
      return { accessDenied: true as const };
    }

    const { positions } = await getPositions();

    return {
      accessDenied: false as const,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      userName: session.user.name || undefined,
    };
  });

type WeeklyCheckinRecordsInput = {
  page?: number;
};

export const loadWeeklyCheckinRecords = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: WeeklyCheckinRecordsInput) => data)
  .handler(async ({ data: deps, context: { session } }) => {

    const hasAccess = hasWeeklyCheckinViewerAccess(session.user.email);
    if (!hasAccess) {
      return { accessDenied: true as const };
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
      accessDenied: false as const,
      checkins,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      positionMap,
    };
  });
