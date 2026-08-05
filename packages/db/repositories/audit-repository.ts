/**
 * Audit adapter — binds the production D1 instance to the pure Audit module.
 * All callers keep importing from here; the implementation lives in
 * `../modules/audit` (testable with an injected db).
 */
import { db } from "@workspace/db/db";
import {
  insertAuditLog as insertAuditLogModule,
  listAuditLogs as listAuditLogsModule,
  type AuditLogQueryOptions,
  type InsertAuditLogParams,
} from "../modules/audit";

export const insertAuditLog = (params: InsertAuditLogParams) =>
  insertAuditLogModule(params, db);

export const getAuditLogs = (options: AuditLogQueryOptions) =>
  listAuditLogsModule(options, db);
