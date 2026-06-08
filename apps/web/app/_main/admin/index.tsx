import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { fetchNonAdminUsers } from "@/lib/admin/fetch-non-admin-users";
import { getSession } from "@/lib/middleware/auth-guard";
import { toOptionalString, toPageNumber } from "@/lib/parse-search";

export const Route = createFileRoute("/_main/admin/")({
  head: () => ({
    meta: [{ title: "Admin" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "admin") {
      throw redirect({ to: "/" });
    }

    const currentPage = deps.page ?? 1;
    const limit = 10;
    const { users, total } = await fetchNonAdminUsers(
      deps.name,
      deps.email,
      currentPage,
      limit,
    );
    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  },
  component: AdminPage,
});

function AdminPage() {
  const {
    users,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Admin</h1>
      </div>

      <div className="border-t pt-8 mt-4">
        <AdminUsersClient
          users={users}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      </div>
    </div>
  );
}
