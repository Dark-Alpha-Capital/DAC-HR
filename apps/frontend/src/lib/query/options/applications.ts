import { queryOptions } from "@tanstack/react-query";
import {
  loadApplicationDetail,
  loadApplicationsIndex,
} from "~/lib/loaders/candidates";
import { getSession } from "~/lib/get-session";
import { queryKeys } from "~/lib/query/query-keys";

export type ApplicationsIndexDeps = {
  name?: string;
  email?: string;
  position?: string[];
  status?: string[];
  page?: number;
};

export function applicationsIndexQueryOptions(deps: ApplicationsIndexDeps) {
  return queryOptions({
    queryKey: queryKeys.applications.list(deps),
    queryFn: () => loadApplicationsIndex({ data: deps }),
  });
}

export function applicationDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.applications.detail(id),
    queryFn: async () => {
      const [detail, session] = await Promise.all([
        loadApplicationDetail({ data: id }),
        getSession(),
      ]);
      return {
        application: (detail as { application: unknown }).application,
        candidate: (detail as { candidate: unknown }).candidate,
        sessions: (detail as { sessions: unknown }).sessions,
        aiScreenings: (detail as { aiScreenings: unknown }).aiScreenings,
        documents: (detail as { documents: unknown }).documents,
        users: (detail as { users: unknown }).users,
        currentUser: session?.user ?? null,
      };
    },
  });
}
