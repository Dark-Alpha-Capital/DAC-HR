import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "~/components/route-skeletons/list-page-skeleton";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminUsersClient } from "~/components/admin/admin-users-client";
import {
  fetchNonAdminUsers,
  type AdminUser,
} from "~/lib/admin/fetch-non-admin-users";
import { getSession } from "~/lib/get-session";
import { toOptionalString, toPageNumber } from "~/lib/parse-search";
import { queryKeys } from "~/lib/query/query-keys";

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

type AdminUsersIndexSearch = ReturnType<typeof parseAdminUsersSearch>;

type AdminUsersIndexData = {
  users: AdminUser[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function adminUsersIndexQueryOptions(deps: AdminUsersIndexSearch) {
  return queryOptions({
    queryKey: queryKeys.admin.usersList(deps),
    queryFn: async (): Promise<AdminUsersIndexData> => {
      const currentPage = deps.page ?? 1;
      const limit = 10;
      const { users, total } = await fetchNonAdminUsers({
        data: {
          name: deps.name,
          email: deps.email,
          page: currentPage,
          limit,
        },
      });
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
    placeholderData: keepPreviousData,
  });
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
  const { data, isLoading }: UseQueryResult<AdminUsersIndexData> = useQuery(
    adminUsersIndexQueryOptions(search),
  );

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
