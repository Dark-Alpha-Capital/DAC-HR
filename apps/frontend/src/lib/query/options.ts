import { queryOptions } from "@tanstack/react-query";

type LoaderFn<Deps, Result> = (deps: Deps) => Promise<Result>;

type PlaceholderData = <T>(previousData: T | undefined) => T | undefined;

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
  extra?: { placeholderData?: PlaceholderData },
) {
  return {
    key,
    options: (deps: Deps) =>
      queryOptions({
        queryKey: key(deps),
        queryFn: () => load(deps),
        placeholderData: extra?.placeholderData,
      }),
  };
}
