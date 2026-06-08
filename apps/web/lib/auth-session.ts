import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/auth";

export type AppSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}

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
