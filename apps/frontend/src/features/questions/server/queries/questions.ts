import { createServerFn } from "@tanstack/react-start";
import { serverFnAuthGuard } from "#/lib/middleware/auth-guard";
import {
  getPositions,
  getQuestionById,
  getQuestionsWithRounds,
  getRounds,
} from "@workspace/db/modules/positions";

type QuestionsIndexInput = {
  search?: string;
  position?: string[];
  round?: string[];
  page?: number;
};

export const loadQuestionsIndex = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: QuestionsIndexInput) => data)
  .handler(async ({ data: deps, context: { session } }) => {
    const limit = 50;
    const currentPage = deps.page ?? 1;

    const [{ positions }, rounds, questionsResult] = await Promise.all([
      getPositions(),
      getRounds(),
      getQuestionsWithRounds(
        deps.search || undefined,
        deps.position && deps.position.length > 0 ? deps.position : undefined,
        deps.round && deps.round.length > 0 ? deps.round : undefined,
        currentPage,
        limit,
      ),
    ]);

    const { questions, total } = questionsResult;
    const totalPages = Math.ceil(total / limit);

    return {
      positions: positions.map((p) => ({ id: p.id, name: p.name })),
      rounds,
      questions,
      currentPage,
      limit,
      totalCount: total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      hasFilters: Boolean(
        deps.search || deps.position?.length || deps.round?.length,
      ),
    };
  });

export const loadQuestionsNew = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .handler(async () => {
    const { positions } = await getPositions();

    return {
      positions: positions.map((position) => ({
        id: position.id,
        name: position.name,
      })),
    };
  });

export const loadQuestionById = createServerFn({ method: "GET" })
  .middleware([serverFnAuthGuard])
  .validator((data: string) => data)
  .handler(async ({ data: id, context: { session } }) => {
    const question = await getQuestionById(id);
    return { question };
  });

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#/lib/query/query-keys";
import { toPageNumber, toStringArray } from "#/lib/parse-search";

export function parseQuestionsSearch(search: Record<string, unknown>) {
  return {
    search: typeof search.search === "string" ? search.search : "",
    position:
      toStringArray(search.position as string | string[] | undefined) ?? [],
    round: toStringArray(search.round as string | string[] | undefined) ?? [],
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

export type QuestionsIndexSearch = ReturnType<typeof parseQuestionsSearch>;
export type QuestionsIndexData = Awaited<ReturnType<typeof loadQuestionsIndex>>;

export function questionsIndexQueryOptions(deps: QuestionsIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.questions.list(deps),
    queryFn: async (): Promise<QuestionsIndexData> =>
      loadQuestionsIndex({ data: deps }),
    placeholderData: keepPreviousData,
  });
}
