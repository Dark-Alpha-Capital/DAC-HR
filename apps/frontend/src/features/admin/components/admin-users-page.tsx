import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { ListPageSkeleton } from "#/components/shared/list-page-skeleton";
import { useSearch } from "@tanstack/react-router";
import { AdminUsersClient } from "#/features/admin/components/admin-users-client";
import { fetchNonAdminUsers, type AdminUser } from "#/features/admin/server/queries/users";
import { queryKeys } from "#/lib/query/query-keys";
import { toOptionalString, toPageNumber } from "#/lib/parse-search";

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

export { parseAdminUsersSearch };

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

export function AdminUsersPage() {
  const search = useSearch({ from: "/_main/admin/" });
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
