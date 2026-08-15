import { createMiddleware } from "@tanstack/react-start";
import { getSession } from "#/features/auth/server/get-session-user";
import { isPublicApiPath } from "#/lib/middleware/public-paths";

export const apiAuthGuard = createMiddleware().server(
  async ({ request, next }) => {
    const pathname = new URL(request.url).pathname;

    if (!pathname.startsWith("/api/") || isPublicApiPath(pathname)) {
      return next();
    }

    const session = await getSession();
    if (!session?.user) {
      throw Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return next({ context: { session } });
  },
);
