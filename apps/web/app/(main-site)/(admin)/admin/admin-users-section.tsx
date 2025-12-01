import React from "react";
import { Suspense } from "react";
import { db } from "@workspace/db";
import { user } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { AdminUsersClient, AdminUser } from "./admin-users-client";

async function fetchNonAdminUsers(): Promise<AdminUser[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(sql`${user.role} IS NULL OR ${user.role} != 'admin'`);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    banned: row.banned ?? false,
    banReason: row.banReason,
    banExpires: row.banExpires ? row.banExpires.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

async function AdminUsersSectionInner() {
  const users = await fetchNonAdminUsers();

  return <AdminUsersClient users={users} />;
}

export function AdminUsersSection() {
  return (
    <Suspense
      fallback={
        <div className="mt-8 text-sm text-muted-foreground">
          Loading users and access controls...
        </div>
      }
    >
      <AdminUsersSectionInner />
    </Suspense>
  );
}
