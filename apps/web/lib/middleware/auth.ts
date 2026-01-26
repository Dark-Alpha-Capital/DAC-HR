import { auth } from "@/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Authentication helper for Next.js API routes
 * Verifies the Bearer token from Authorization header using Better Auth
 * Returns the session and user, or null if unauthorized
 */
export async function getAuthenticatedUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return null;
    }

    return {
      user: session.user,
      session: session.session,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Middleware wrapper that ensures authentication
 * Returns NextResponse with 401 if not authenticated
 */
export async function requireAuth() {
  const authResult = await getAuthenticatedUser();

  if (!authResult) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 },
    );
  }

  return authResult;
}
