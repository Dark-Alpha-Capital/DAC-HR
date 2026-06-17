import { createServerFn } from "@tanstack/react-start";
import { db } from "@workspace/db/db";
import { sql, and, count } from "@workspace/db";
import { ilike } from "@workspace/db/sqlite-helpers";
import { user } from "@workspace/db/schema";
import { getSession } from "~/lib/get-session";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
};

type FetchNonAdminUsersInput = {
  name?: string;
  email?: string;
  page?: number;
  limit?: number;
};

async function queryNonAdminUsers(
  nameSearch?: string,
  emailSearch?: string,
  page = 1,
  limit = 10,
): Promise<{ users: AdminUser[]; total: number }> {
  const offset = (page - 1) * limit;
  const conditions = [sql`${user.role} IS NULL OR ${user.role} != 'admin'`];

  if (nameSearch?.trim()) {
    conditions.push(ilike(user.name, `%${nameSearch.trim()}%`));
  }

  if (emailSearch?.trim()) {
    conditions.push(ilike(user.email, `%${emailSearch.trim()}%`));
  }

  const totalResult = await db
    .select({ count: count() })
    .from(user)
    .where(and(...conditions));

  const total = totalResult[0]?.count ?? 0;

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(and(...conditions))
    .orderBy(user.createdAt)
    .limit(limit)
    .offset(offset);

  const users = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: row.role,
    banned: row.banned ?? false,
    banReason: row.banReason,
    banExpires: row.banExpires ? row.banExpires.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));

  return { users, total };
}

export const fetchNonAdminUsers = createServerFn({ method: "GET" })
  .validator((data: FetchNonAdminUsersInput) => data)
  .handler(async ({ data }) => {
    const session = await getSession();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (session.user.role !== "admin") {
      throw new Error("Forbidden");
    }

    return queryNonAdminUsers(
      data.name,
      data.email,
      data.page ?? 1,
      data.limit ?? 10,
    );
  });
