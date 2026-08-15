import { db } from "@workspace/db/db";
import { z } from "zod";
import { sql, and, count } from "@workspace/db";
import { ilike } from "@workspace/db/sqlite-helpers";
import { user } from "@workspace/db/schema";
import {
  getAuditLogs,
  insertAuditLog,
} from "@workspace/db/repositories/audit-repository";

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

type AuditLogInput = {
  action?: string;
  entityType?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
};

/** Arbitrary JSON-serializable metadata attached to an audit log entry. */
const auditLogDetailsSchema = z.record(z.string(), z.unknown());
type AuditLogDetails = z.infer<typeof auditLogDetailsSchema>;

export type AuditLogRow = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogsPageData = {
  logs: AuditLogRow[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export const adminService = {
  async queryUsers(
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
  },

  async listAuditLogs(deps: AuditLogInput): Promise<AuditLogsPageData> {
    const currentPage = deps.page ?? 1;
    const limit = 20;

    const result = await getAuditLogs({
      action: deps.action,
      entityType: deps.entityType,
      userId: deps.userId,
      search: deps.search,
      page: currentPage,
      limit,
      startDate: deps.startDate ? new Date(deps.startDate) : undefined,
      endDate: deps.endDate ? new Date(deps.endDate) : undefined,
    });

    const totalPages = Math.ceil(result.total / limit);

    return {
      logs: result.logs.map((log) => ({
        ...log,
        // SAFETY: audit_log.details is a TEXT JSON column written by
        // insertAuditLog with only JSON primitive values (string, number,
        // boolean, null), so the D1 value matches AuditLogRow["details"].
        details: log.details as AuditLogRow["details"],
      })),
      total: result.total,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  },

  async insertAuditLog(input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details: AuditLogDetails;
  }) {
    return insertAuditLog(input);
  },
};
