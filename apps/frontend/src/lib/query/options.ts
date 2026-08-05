import { queryOptions } from "@tanstack/react-query";

type LoaderFn<Deps, Result> = (deps: Deps) => Promise<Result>;

/**
 * Defines a typed query-options pair for one entity list/detail loader.
 *
 * Collapses the per-route inline `queryOptions` wrappers into a single seam:
 *
 *   const candidatesQ = defineEntityQueries(queryKeys.candidates.list, loadCandidatesIndex)
 *   candidatesQ.options(search)   // -> queryOptions for useQuery / ensureQueryData
 *
 * `queryKey` is derived from the loader and the deps, so `invalidateQueries`
 * against the shared key registry (`queryKeys`) still works.
 */
export function defineEntityQueries<Deps, Result>(
  key: (deps: Deps) => readonly unknown[],
  load: LoaderFn<Deps, Result>,
  extra?: { placeholderData?: unknown },
) {
  return {
    key,
    options: (deps: Deps) =>
      queryOptions({
        queryKey: key(deps) as string[],
        queryFn: () => load(deps),
        placeholderData: extra?.placeholderData as never,
      }),
  };
}
