import { useEffect, useRef, useTransition, useOptimistic } from "react";
import { useUrlSearchParams } from "#/lib/hooks/use-url-search-params";
import { resetListPageParam } from "#/lib/parse-search";

/**
 * Pure: build the next URL params for a multi-select filter, resetting `page`.
 * The selected values replace the param's current values.
 */
export function buildMultiSelectParams(
  searchParams: URLSearchParams,
  param: string,
  next: string[],
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  params.delete(param);
  for (const value of next) {
    params.append(param, value);
  }
  resetListPageParam(params);
  return params;
}

/**
 * Pure: build the next URL params for a debounced text filter, resetting `page`.
 * An empty/whitespace value removes the param entirely.
 */
export function buildTextSearchParams(
  searchParams: URLSearchParams,
  param: string,
  value: string,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);
  const trimmed = value.trim();
  if (trimmed) {
    params.set(param, trimmed);
  } else {
    params.delete(param);
  }
  resetListPageParam(params);
  return params;
}

/**
 * Shared URL-state cycle for list-page multi-select filters.
 *
 * Every list filter was re-implementing the same cycle: seed from
 * `searchParams.getAll(param)`, optimistic update, delete/re-append the param,
 * reset `page`, and commit via `setSearchParams`. The copies had already
 * drifted (some dropped the page-reset, some the count badge), so this is the
 * single source of truth. Changing a filter always resets to page 1.
 */
export function useMultiSelectFilter(
  param: string,
  options?: {
    /** Extra param mutations before committing (e.g. clearing a related param). */
    onMutate?: (
      params: URLSearchParams,
      next: string[],
      prev: string[],
    ) => void;
  },
) {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic(searchParams.getAll(param));

  const update = (next: string[]) => {
    startTransition(() => {
      const params = buildMultiSelectParams(searchParams, param, next);
      options?.onMutate?.(params, next, selected);
      setSelected(next);
      setSearchParams(params);
    });
  };

  const toggle = (value: string) =>
    update(
      selected.includes(value)
        ? selected.filter((current) => current !== value)
        : [...selected, value],
    );

  return { selected, isPending, update, toggle, setSelected };
}

/**
 * Shared debounced text-input filter for list pages.
 *
 * Same cycle as the multi-select filter but with a debounced text input
 * (set/delete a single param after a quiet period, resetting `page`).
 */
export function useDebouncedParam(param: string, delay = 300) {
  const { searchParams, setSearchParams } = useUrlSearchParams();
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        const params = buildTextSearchParams(searchParams, param, value);
        setSearchParams(params);
      });
    }, delay);
  };

  return { isPending, handleSearch };
}
