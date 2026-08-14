import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";

export async function getSession() {
  const request = getRequest();
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}
