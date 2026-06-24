import { useQuery } from "@tanstack/react-query";
import { applicationDetailQueryOptions } from "~/lib/query/options/applications";

export function useApplicationDetail(id: string) {
  return useQuery(applicationDetailQueryOptions(id));
}
