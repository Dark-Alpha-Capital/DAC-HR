import { createServerFn } from "@tanstack/react-start";
import { auth } from "#/lib/auth";
import { getSession } from "#/features/auth/server/get-session-user";

export type AppSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Client-callable session resolver. Server-side callers should use
 * `getSession` from `#/lib/server/session.server` directly — this is a thin
 * `createServerFn` wrapper over the same single resolver.
 */
export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return getSession();
  },
);
