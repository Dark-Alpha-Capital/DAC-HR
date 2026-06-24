import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminUsersClient } from "~/components/admin/admin-users-client";
import { getSession } from "~/lib/get-session";
import { adminUsersIndexQueryOptions } from "~/lib/query/options/admin";
import { useAdminUsersIndex } from "~/hooks/queries/use-admin-index";
import { toOptionalString, toPageNumber } from "~/lib/parse-search";

function parseAdminUsersSearch(search: Record<string, unknown>) {
  return {
    name: toOptionalString(search.name),
    email: toOptionalString(search.email),
    page:
      search.page !== undefined
        ? toPageNumber(search.page)
        : (undefined as number | undefined),
  };
}

export const Route = createFileRoute("/_main/admin/")({
  head: () => ({
    meta: [{ title: "Admin" }],
  }),
  validateSearch: parseAdminUsersSearch,
  loader: async ({ context: { queryClient }, location }) => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    if (session.user.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }

    const search = parseAdminUsersSearch(
      location.search as Record<string, unknown>,
    );
    await queryClient.ensureQueryData(adminUsersIndexQueryOptions(search));
  },
  component: AdminPage,
});

function AdminPage() {
  const search = Route.useSearch();
  const { data, isLoading } = useAdminUsersIndex(search);

  if (isLoading && !data) {
    return <ListPageSkeleton showActions={false} />;
  }

  if (!data) {
    return null;
  }

  const {
    users,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = data;

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
