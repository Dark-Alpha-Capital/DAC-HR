import { useCallback, useMemo } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";

function getSearchString(href: string) {
  const queryStart = href.indexOf("?");
  if (queryStart === -1) return "";
  const hashStart = href.indexOf("#", queryStart);
  return hashStart === -1
    ? href.slice(queryStart + 1)
    : href.slice(queryStart + 1, hashStart);
}

/** SSR-safe replacement for Next.js `useSearchParams` + `window.location`. */
export function useUrlSearchParams() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchString = useRouterState({
    select: (s) => getSearchString(s.location.href),
  });

  const searchParams = useMemo(
    () => new URLSearchParams(searchString),
    [searchString],
  );

  const setSearchParams = useCallback(
    (params: URLSearchParams, targetPath = pathname) => {
      const qs = params.toString();
      void router.navigate({
        href: qs ? `${targetPath}?${qs}` : targetPath,
      });
    },
    [router, pathname],
  );

  return { searchParams, setSearchParams, pathname };
}
