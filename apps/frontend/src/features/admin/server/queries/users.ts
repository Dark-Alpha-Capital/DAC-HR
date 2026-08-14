import { createServerFn } from "@tanstack/react-start";
import { serverFnAdminGuard } from "#/lib/middleware/auth-guard";
import {
  queryNonAdminUsers,
  type AdminUser,
} from "#/features/admin/admin-service";

export type { AdminUser };

type FetchNonAdminUsersInput = {
  name?: string;
  email?: string;
  page?: number;
  limit?: number;
};

export const fetchNonAdminUsers = createServerFn({ method: "GET" })
  .middleware([serverFnAdminGuard])
  .validator((data: FetchNonAdminUsersInput) => data)
  .handler(async ({ data }) => {
    return queryNonAdminUsers(
      data.name,
      data.email,
      data.page ?? 1,
      data.limit ?? 10,
    );
  });
