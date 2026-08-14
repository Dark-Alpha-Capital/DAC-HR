import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  getCandidatesByPositionId,
  getPositionBySlug,
  getPositions,
  getRoundsByPositionId,
} from "@workspace/db/modules/positions";
import { getScreenerByPositionId } from "@workspace/db/repositories/screener-repository";

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
      return { position: null, rounds: [], candidates: [], screener: null };
    }

    const [rounds, candidates, screener] = await Promise.all([
      getRoundsByPositionId(position.id),
      getCandidatesByPositionId(position.id),
      getScreenerByPositionId(position.id),
    ]);

    return { position, rounds, candidates, screener };
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

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toPageNumber, toStringArray } from "#/lib/parse-search";

export function parsePositionsSearch(search: Record<string, unknown>) {
  return {
    search: typeof search.search === "string" ? search.search : "",
    hireLevel: toStringArray(search.hireLevel as string | string[] | undefined),
    status: toStringArray(search.status as string | string[] | undefined),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

export type PositionsIndexSearch = ReturnType<typeof parsePositionsSearch>;
export type PositionsIndexData = Awaited<ReturnType<typeof loadPositionsIndex>>;

export function positionsIndexQueryOptions(deps: PositionsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.positions.list(deps),
    queryFn: async (): Promise<PositionsIndexData> =>
      loadPositionsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
