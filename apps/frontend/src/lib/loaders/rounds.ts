import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import {
  getFirstPositionIdForRoundTemplate,
  getPositions,
  getPositionsByRoundId,
  getQuestionsByRoundId,
  getRoundById,
  getRoundsByPositionId,
  getRoundsWithPositions,
} from "@workspace/db/queries";

type RoundsIndexInput = {
  type?: string[];
  page?: number;
};

export const loadRoundsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: RoundsIndexInput) => data)
  .handler(async ({ data: deps, context: { session } }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, roundsResult] = await Promise.all([
      getPositions(),
      getRoundsWithPositions(deps.type, currentPage, limit),
    ]);

    const { rounds, total } = roundsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      rounds,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(deps.type?.length),
    };
  });

type RoundsNewInput = {
  position?: string;
};

export const loadRoundsNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: RoundsNewInput) => data)
  .handler(async ({ data: deps, context: { session } }) => {
    const positionsResult = await getPositions();
    return {
      positions: positionsResult.positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      preSelectedPositionId: deps.position ?? "",
    };
  });

export const loadRoundById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    const [round, positions, questions] = await Promise.all([
      getRoundById(id),
      getPositionsByRoundId(id),
      getQuestionsByRoundId(id),
    ]);
    return { round, positions, questions };
  });

export const loadRoundEdit = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    const round = await getRoundById(id);
    return { round };
  });

type RoundAddQuestionInput = {
  roundId: string;
  position?: string;
};

export const loadRoundAddQuestion = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: RoundAddQuestionInput) => data)
  .handler(async ({ data, context: { session } }) => {
    const round = await getRoundById(data.roundId);

    if (!round) {
      return {
        round: null,
        positions: [],
        rounds: [],
        preSelectedPositionId: "",
        preSelectedRoundId: data.roundId,
      };
    }

    const defaultPositionId = await getFirstPositionIdForRoundTemplate(
      data.roundId,
    );
    const positionId = data.position || defaultPositionId || "";
    const { positions } = await getPositions();
    const rounds = positionId
      ? (await getRoundsByPositionId(positionId)).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        }))
      : [];

    return {
      round,
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
      rounds,
      preSelectedPositionId: positionId,
      preSelectedRoundId: data.roundId,
    };
  });
