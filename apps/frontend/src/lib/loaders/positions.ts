import { createServerFn } from "@tanstack/react-start";
import {
  getCandidatesByPositionId,
  getPositionBySlug,
  getPositions,
  getRoundsByPositionId,
} from "@workspace/db/queries";

type PositionsIndexInput = {
  hireLevel?: string[];
  status?: string[];
  page?: number;
};

export const loadPositionsIndex = createServerFn({ method: "GET" })
  .validator((data: PositionsIndexInput) => data)
  .handler(async ({ data: deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const { positions, total } = await getPositions(
      deps.hireLevel,
      deps.status,
      currentPage,
      limit,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      positions,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  });

export const loadPositionBySlug = createServerFn({ method: "GET" })
  .validator((data: string) => data)
  .handler(async ({ data: slug }) => {
    const position = await getPositionBySlug(slug);

    if (!position) {
      return { position: null, rounds: [], candidates: [] };
    }

    const [rounds, candidates] = await Promise.all([
      getRoundsByPositionId(position.id),
      getCandidatesByPositionId(position.id),
    ]);

    return { position, rounds, candidates };
  });

export const loadPositionEdit = createServerFn({ method: "GET" })
  .validator((data: string) => data)
  .handler(async ({ data: slug }) => {
    const position = await getPositionBySlug(slug);
    return { position };
  });
