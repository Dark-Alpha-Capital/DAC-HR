import { createServerFn } from "@tanstack/react-start";

export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { auth } = await import("~/auth");
    const request = getRequest();
    return auth.api.getSession({ headers: request.headers });
  },
);
