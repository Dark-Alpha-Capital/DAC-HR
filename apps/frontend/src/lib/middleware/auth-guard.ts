import { createMiddleware } from "@tanstack/react-start";
import { getSession } from "#/lib/server/session.server";

/** Function middleware for authenticated server functions. */
export const serverFnAuthGuard = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await getSession();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    return next({ context: { session } });
  },
);

/** Function middleware for admin-only server functions. */
export const serverFnAdminGuard = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await getSession();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (session.user.role !== "admin") {
      throw new Error("Forbidden");
    }

    return next({ context: { session } });
  },
);
