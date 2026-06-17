import { createServerFn } from "@tanstack/react-start";

export const getServerSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { auth } = await import("~/auth");
    const request = getRequest();
    try {
      return await auth.api.getSession({ headers: request.headers });
    } catch {
      return null;
    }
  },
);

export async function getSession() {
  return getServerSession();
}
