import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "~/lib/middleware/auth-guard";
import {
  getCandidatesByPositionId,
  getPositionBySlug,
  getPositions,
  getRoundsByPositionId,
} from "@workspace/db/queries";

type PositionsIndexInput = {
  search?: string;
  hireLevel?: string[];
  status?: string[];
  page?: number;
};

export const loadPositionsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: PositionsIndexInput) => data)
  .handler(async ({ data: deps }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;
    const { positions, total } = await getPositions(
      deps.hireLevel,
      deps.status,
      currentPage,
      limit,
      deps.search,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      positions,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.search?.trim() || deps.hireLevel?.length || deps.status?.length,
      ),
    };
  });

export const loadPositionBySlug = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: slug, context: { session } }) => {
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
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: slug, context: { session } }) => {
    const position = await getPositionBySlug(slug);
    return { position };
  });

export const loadPositionOptions = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async () => {
    const { positions } = await getPositions(undefined, undefined, 1, 200);
    return positions.map((p) => ({ id: p.id, name: p.name }));
  });
