import { createMiddleware } from "@tanstack/react-start";
import { getSession } from "./get-session-user";

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

/** Same as auth — extra admin role checks are disabled for now. */
export const serverFnAdminGuard = serverFnAuthGuard;
