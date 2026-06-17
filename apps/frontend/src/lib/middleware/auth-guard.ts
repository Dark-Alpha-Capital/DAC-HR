import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getSession } from "~/lib/server/session.server";

export const authGuard = createMiddleware().server(async ({ next }) => {
  const session = await getSession();

  if (!session || !session.user) {
    throw redirect({ to: "/login" });
  }

  return next({
    context: { session },
  });
});

export const adminGuard = createMiddleware().server(async ({ next }) => {
  const session = await getSession();

  if (!session || !session.user) {
    throw redirect({ to: "/login" });
  }

  if (session.user.role !== "admin") {
    throw redirect({ to: "/" });
  }

  return next({
    context: { session },
  });
});
