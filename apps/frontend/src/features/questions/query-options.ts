import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { queryKeys } from "#/lib/query/query-keys";
import { toPageNumber, toStringArray } from "#/lib/parse-search";
import { loadQuestionsIndex } from "./server/queries/questions";

/** Raw questions-list search params (route search object) before validation. */
type QuestionsSearchRawInput = {
  search?: unknown;
  position?: unknown;
  round?: unknown;
  page?: unknown;
};

export function parseQuestionsSearch(search: QuestionsSearchRawInput) {
  const searchResult = z.string().safeParse(search.search);
  const positionResult = z
    .union([z.string(), z.array(z.string())])
    .safeParse(search.position);
  const roundResult = z
    .union([z.string(), z.array(z.string())])
    .safeParse(search.round);

  return {
    search: searchResult.success ? searchResult.data : "",
    position:
      toStringArray(
        positionResult.success ? positionResult.data : undefined,
      ) ?? [],
    round:
      toStringArray(roundResult.success ? roundResult.data : undefined) ?? [],
    page: search.page !== undefined ? toPageNumber(search.page) : undefined,
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
