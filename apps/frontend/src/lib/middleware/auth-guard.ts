import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/server/session.server";

/** Request middleware for route loaders — redirects to login. */
export const authGuard = createMiddleware().server(async ({ next }) => {
  const session = await getSession();

  if (!session || !session.user) {
    throw redirect({ to: "/login" });
  }

  return next({
    context: { session },
  });
});

/** Request middleware for admin routes — redirects to login or home. */
export const adminGuard = createMiddleware().server(async ({ next }) => {
  const session = await getSession();

  if (!session || !session.user) {
    throw redirect({ to: "/login" });
  }

  if (session.user.role !== "admin") {
    throw redirect({ to: "/dashboard" });
  }

  return next({
    context: { session },
  });
});

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
