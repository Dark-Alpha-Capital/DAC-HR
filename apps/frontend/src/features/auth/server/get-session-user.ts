import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";

/**
 * Centralized session resolver for server functions. Returns the full
 * better-auth session (`{ user, session }`) or `null` when unauthenticated.
 */
export async function getSession() {
  const request = getRequest();
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

/** Returns just the signed-in user (or `null`). */
export const getSessionUser = async () => {
  const session = await getSession();
  return session?.user ?? null;
};
