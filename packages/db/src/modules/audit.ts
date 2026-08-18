/**
 * Audit module — owns all audit_log reads/writes. Pure: takes the db instance
 * as an argument so it can be tested against an in-memory SQLite db without the
 * Cloudflare runtime. `repositories/audit-repository.ts` is the thin adapter
 * that binds the production D1 instance.
 */
import { and, count, desc, eq, gte, lte, or } from "drizzle-orm";
import { ilike } from "../sqlite-helpers";
import { auditLog, user, type JsonObject } from "../schema";
import type { Database } from "@workspace/db/db";

export type InsertAuditLogParams = {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: JsonObject;
};

/** Insert one audit log row. Returns the created row, or null on failure. */
export async function insertAuditLog(
  params: InsertAuditLogParams,
  db: Database,
) {
  try {
    const [logEntry] = await db
      .insert(auditLog)
      .values({
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
      })
      .returning();

    return logEntry;
  } catch (error) {
    console.error("Error inserting audit log", error);
    return null;
  }
}

export type AuditLogQueryOptions = {
  action?: string;
  entityType?: string;
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
  startDate?: Date | string;
  endDate?: Date | string;
};

/** Paginated, filterable audit log list, newest first. */
export async function listAuditLogs(
  options: AuditLogQueryOptions,
  db: Database,
): Promise<{
  logs: Array<{
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string | null;
    action: string;
    entityType: string;
    entityId: string;
    details: JsonObject | null;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
}> {
  try {
    const {
      action,
      entityType,
      userId,
      page = 1,
      limit = 10,
      search,
      startDate,
      endDate,
    } = options;

    const offset = (page - 1) * limit;
    const conditions = [];

    if (action && action.trim()) {
      conditions.push(ilike(auditLog.action, `%${action.trim()}%`));
    }

    if (entityType && entityType.trim()) {
      conditions.push(ilike(auditLog.entityType, `%${entityType.trim()}%`));
    }

    if (userId && userId.trim()) {
      conditions.push(eq(auditLog.userId, userId.trim()));
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(auditLog.action, searchTerm),
          ilike(auditLog.entityType, searchTerm),
          ilike(auditLog.entityId, searchTerm),
        )!,
      );
    }

    if (startDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      conditions.push(gte(auditLog.createdAt, start));
    }

    if (endDate) {
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLog.createdAt, endOfDay));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db
      .select({ count: count() })
      .from(auditLog)
      .where(where);
    const total = totalResult[0]?.count ?? 0;

    const logs = await db
      .select({
        id: auditLog.id,
        userId: auditLog.userId,
        userName: user.name,
        userEmail: user.email,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        details: auditLog.details,
        createdAt: auditLog.createdAt,
        updatedAt: auditLog.updatedAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.userId, user.id))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        userEmail: log.userEmail,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching audit logs", error);
    return { logs: [], total: 0 };
  }
}
