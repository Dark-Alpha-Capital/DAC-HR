import { createServerFn } from "@tanstack/react-start";
import { serverFnAdminGuard } from "#/features/auth/server/auth-middleware";
import {
  adminService,
  type AdminUser,
} from "../admin-service";

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
  .handler(async ({ data }) =>
    adminService.queryUsers(
      data.name,
      data.email,
      data.page ?? 1,
      data.limit ?? 10,
    ),
  );
