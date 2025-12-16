import type { Context, Next } from "hono";
import { auth } from "../auth";

// Define the context type to match the main app
type AuthContext = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

/**
 * Authentication middleware for Hono
 * Verifies the Bearer token from Authorization header using Better Auth
 */
export async function authMiddleware(c: Context<AuthContext>, next: Next) {
  console.log("inside auth middleware");
  // console.log(c.req.raw.headers);
  try {
    // Use Better Auth's getSession which automatically handles Bearer tokens
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      console.log("no session or user");

      return c.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        401
      );
    }

    console.log("session and user found");
    // console.log(session);

    // Attach user and session to context for use in route handlers
    c.set("user", session.user);
    c.set("session", session.session);

    await next();
  } catch (error) {
    console.error("Authentication error:", error);
    return c.json(
      {
        success: false,
        message: "Authentication failed",
      },
      401
    );
  }
}
