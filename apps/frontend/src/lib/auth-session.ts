import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "~/auth";

export type AppSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    try {
      return await auth.api.getSession({ headers: request.headers });
    } catch {
      return null;
    }
  },
);
