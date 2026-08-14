/**
 * Server-only Google access token resolution for Meet/Calendar attendance.
 * Kept in its own module so `meet-attendance.ts` stays client-safe.
 */

import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";

const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.readonly";

export type GoogleAccessOk = {
  session: { user: { id: string; email: string; name: string } };
  accessToken: string;
  scope: string;
};

export type GoogleAccessErr = { error: string };

export async function getGoogleAccessToken(): Promise<
  GoogleAccessOk | GoogleAccessErr
> {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return { error: "Not signed in" };
  }

  const tokenResult = await auth.api.getAccessToken({
    body: { providerId: "google" },
    headers,
  });

  if (!tokenResult.accessToken) {
    return {
      error: "No Google access token. Sign out and sign in with Google again.",
    };
  }

  const grantedScopes = Array.isArray(tokenResult.scopes)
    ? tokenResult.scopes
    : [];
  const grantedScope = grantedScopes.join(" ");
  if (grantedScope && !grantedScope.includes(MEET_SCOPE)) {
    return {
      error:
        "Meet access not granted. Sign out and sign in again to grant Meet attendance permission.",
    };
  }

  return {
    session: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    },
    accessToken: tokenResult.accessToken,
    scope: grantedScope,
  };
}
