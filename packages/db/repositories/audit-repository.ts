import { and, count, desc, eq, gte, lte, or } from "drizzle-orm";
import { db } from "@workspace/db/db";
import { ilike } from "../sqlite-helpers";
import { auditLog, user } from "../schema";

export const insertAuditLog = async (params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
}) => {
  try {
    // const [logEntry] = await db
    //   .insert(auditLog)
    //   .values({
    //     userId: params.userId,
    //     action: params.action,
    //     entityType: params.entityType,
    //     entityId: params.entityId,
    //     details: params.details,
    //   })
    //   .returning();

    // return logEntry;


  } catch (error) {
    console.error("Error inserting audit log", error);
    return null;
  }
};

export const getAuditLogs = async (options: {
  action?: string;
  entityType?: string;
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}) => {
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

    const totalResult = await db
      .select({ count: count() })
      .from(auditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
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
};
