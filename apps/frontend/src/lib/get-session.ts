import { fetchSession } from "#/lib/auth-session";

export function getSession() {
  return fetchSession();
}
