import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/auth";

export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({ headers });
}

export async function getSession() {
  try {
    const request = getRequest();
    return await getSessionFromHeaders(request.headers);
  } catch {
    return null;
  }
}
