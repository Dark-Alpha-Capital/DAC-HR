import { createFileRoute, redirect } from "@tanstack/react-router";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { AdminUsersPage, parseAdminUsersSearch } from "#/features/admin/components/admin-users-page";
import { fetchSession as getSession } from "#/lib/auth-session";

export const Route = createFileRoute("/_main/admin/")({
  head: () => ({
    meta: [{ title: "Admin" }],
  }),
  validateSearch: parseAdminUsersSearch,
  loader: async () => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  pendingComponent: () => <ListPageSkeleton showActions={false} />,
  component: AdminUsersPage,
});
