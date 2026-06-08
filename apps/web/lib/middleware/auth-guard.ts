import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { auth } from "@/auth";
import { getRequest } from "@tanstack/react-start/server";

export async function getSession() {
  try {
    const request = getRequest();
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return session;
  } catch {
    return null;
  }
}

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
