import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  questionsIndexQueryOptions,
  type QuestionsIndexDeps,
} from "~/lib/query/options/questions";

export function useQuestionsIndex(deps: QuestionsIndexDeps) {
  return useQuery({
    ...questionsIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
