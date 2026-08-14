import { useRouteContext } from "@tanstack/react-router";
import type { AppSession } from "#/lib/auth-session";

export function useAppSession(): AppSession {
  const context = useRouteContext({ from: "/_main" });
  return context.session ?? null;
}
