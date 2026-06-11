import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { auth } from "@/auth";
import { getSessionFromHeaders } from "@/lib/server/session";

export type Session = typeof auth.$Infer.Session;
export type AppSession = Session | null;

export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
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
