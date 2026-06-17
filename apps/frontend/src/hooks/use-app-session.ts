import { useRouteContext } from "@tanstack/react-router";
import type { AppSession } from "~/lib/auth-session";

type MainRouteContext = {
  session: AppSession;
};

export function useAppSession(): AppSession {
  const context = useRouteContext({
    from: "/_main",
    strict: false,
  }) as MainRouteContext | undefined;

  return context?.session ?? null;
}
