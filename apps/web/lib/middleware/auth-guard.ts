import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { getSessionFromHeaders } from "@/lib/auth-session";

export async function getSession() {
  try {
    const request = getRequest();
    return await getSessionFromHeaders(request.headers);
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
