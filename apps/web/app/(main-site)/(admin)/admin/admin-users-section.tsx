import React from "react";
import { Suspense } from "react";
import { db, sql, and, count } from "@workspace/db";
import { user } from "@workspace/db/schema";
import { AdminUsersClient, AdminUser } from "./admin-users-client";

type SearchParams = Promise<{
  name?: string | string[];
  email?: string | string[];
  page?: string | string[];
}>;

async function fetchNonAdminUsers(
  nameSearch?: string,
  emailSearch?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ users: AdminUser[]; total: number }> {
  const offset = (page - 1) * limit;

  // Build filter conditions
  const conditions = [sql`${user.role} IS NULL OR ${user.role} != 'admin'`];

  // Name search
  if (nameSearch && nameSearch.trim()) {
    const searchTerm = `%${nameSearch.trim()}%`;
    conditions.push(
      sql`${user.name} ILIKE ${sql.raw(`'${searchTerm.replace(/'/g, "''")}'`)}`
    );
  }

  // Email search
  if (emailSearch && emailSearch.trim()) {
    const searchTerm = `%${emailSearch.trim()}%`;
    conditions.push(
      sql`${user.email} ILIKE ${sql.raw(`'${searchTerm.replace(/'/g, "''")}'`)}`
    );
  }

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(user)
    .where(and(...conditions));

  const total = totalResult[0]?.count ?? 0;

  // Fetch users with pagination
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

async function AdminUsersSectionInner({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Extract search terms
  const nameSearch = params.name
    ? typeof params.name === "string"
      ? params.name
      : params.name[0]
    : undefined;

  const emailSearch = params.email
    ? typeof params.email === "string"
      ? params.email
      : params.email[0]
    : undefined;

  // Extract page number (default to 1)
  const page = params.page
    ? typeof params.page === "string"
      ? parseInt(params.page, 10)
      : Array.isArray(params.page) && params.page[0]
        ? parseInt(params.page[0], 10)
        : 1
    : 1;
  const currentPage = isNaN(page) || page < 1 ? 1 : page;
  const limit = 10;

  const { users, total } = await fetchNonAdminUsers(
    nameSearch,
    emailSearch,
    currentPage,
    limit
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminUsersClient
      users={users}
      total={total}
      currentPage={currentPage}
      totalPages={totalPages}
      hasNextPage={currentPage < totalPages}
      hasPreviousPage={currentPage > 1}
    />
  );
}

export function AdminUsersSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="mt-8 text-sm text-muted-foreground">
          Loading users and access controls...
        </div>
      }
    >
      <AdminUsersSectionInner searchParams={searchParams} />
    </Suspense>
  );
}
