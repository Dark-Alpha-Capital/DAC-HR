import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  applicationsIndexQueryOptions,
  type ApplicationsIndexDeps,
} from "~/lib/query/options/applications";

export function useApplicationsIndex(deps: ApplicationsIndexDeps) {
  return useQuery({
    ...applicationsIndexQueryOptions(deps),
    placeholderData: keepPreviousData,
  });
}
