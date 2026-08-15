import { queryOptions, keepPreviousData } from "@tanstack/react-query";

type LoaderFn<Deps, Result> = (deps: Deps) => Promise<Result>;
type PlaceholderData = <T>(previousData: T | undefined) => T | undefined;

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

export const q = defineEntityQueries((d: { a: string }) => ["x", d], async () => 5, {
  placeholderData: keepPreviousData,
});
