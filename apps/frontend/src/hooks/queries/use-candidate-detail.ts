import { useQuery } from "@tanstack/react-query";
import { candidateDetailQueryOptions } from "~/lib/query/options/candidates";

export function useCandidateDetail(uid: string) {
  return useQuery(candidateDetailQueryOptions(uid));
}
