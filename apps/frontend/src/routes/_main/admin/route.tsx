import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchSession as getSession } from "#/lib/auth-session";

export const Route = createFileRoute("/_main/admin")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({ to: "/login" });
    }

    if (session.user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
