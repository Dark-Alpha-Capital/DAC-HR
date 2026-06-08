import { db, sql, and, count } from "@workspace/db";
import { user } from "@workspace/db/schema";

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

export async function fetchNonAdminUsers(
  nameSearch?: string,
  emailSearch?: string,
  page = 1,
  limit = 10,
): Promise<{ users: AdminUser[]; total: number }> {
  const offset = (page - 1) * limit;
  const conditions = [sql`${user.role} IS NULL OR ${user.role} != 'admin'`];

  if (nameSearch?.trim()) {
    const searchTerm = `%${nameSearch.trim()}%`;
    conditions.push(
      sql`${user.name} ILIKE ${sql.raw(`'${searchTerm.replace(/'/g, "''")}'`)}`,
    );
  }

  if (emailSearch?.trim()) {
    const searchTerm = `%${emailSearch.trim()}%`;
    conditions.push(
      sql`${user.email} ILIKE ${sql.raw(`'${searchTerm.replace(/'/g, "''")}'`)}`,
    );
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
