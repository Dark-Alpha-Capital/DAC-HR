import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";

export const Route = createFileRoute("/_main/profile/")({
  head: () => ({
    meta: [{ title: "Profile" }],
  }),
  loader: async () => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw redirect({ to: "/login" });
    }
    throw redirect({
      to: "/profile/$userId",
      params: { userId: session.user.id },
    });
  },
  component: () => null,
});
