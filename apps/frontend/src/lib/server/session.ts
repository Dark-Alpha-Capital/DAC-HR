import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "~/auth";

export async function getSession() {
  const request = getRequest();
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

export const getServerSession = createServerFn({ method: "GET" }).handler(
  async () => getSession(),
);
