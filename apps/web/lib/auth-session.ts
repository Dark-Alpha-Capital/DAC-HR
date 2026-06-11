import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export type AppSession = Awaited<
  ReturnType<
    Awaited<ReturnType<typeof import("@/auth")>>["auth"]["api"]["getSession"]
  >
>;

export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSessionFromHeaders } = await import("@/lib/server/session");
    const headers = getRequestHeaders();
    return getSessionFromHeaders(headers);
  },
);

export const requireSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await fetchSession();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    return session;
  },
);
