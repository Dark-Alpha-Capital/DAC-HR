import { queryOptions } from "@tanstack/react-query";
import { loadQuestionsIndex } from "~/lib/loaders/questions";
import { queryKeys } from "~/lib/query/query-keys";

export type QuestionsIndexDeps = {
  search?: string;
  position?: string[];
  round?: string[];
  page?: number;
};

export function questionsIndexQueryOptions(deps: QuestionsIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.questions.list(deps),
    queryFn: () => loadQuestionsIndex({ data: deps }),
  });
}
