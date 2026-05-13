/**
 * 审计日志 API
 *
 * - GET  /api/audit             — 查询审计日志
 * - GET  /api/audit/stats       — 审计统计
 * - POST /api/audit/cleanup     — 清理过期日志
 */

import { Hono } from "hono";
import { initAuditTables, auditLogger, type AuditCategory, type AuditLevel } from "../services/audit.js";

const auditRouter = new Hono();

let tablesReady = false;
function ensureTables() {
  if (!tablesReady) {
    initAuditTables();
    tablesReady = true;
  }
}

// ===== GET /api/audit =====
auditRouter.get("/", (c) => {
  ensureTables();
  const query = c.req.query();

  const result = auditLogger.query({
    userId: query.userId,
    category: query.category as AuditCategory | undefined,
    level: query.level as AuditLevel | undefined,
    targetType: query.targetType,
    targetId: query.targetId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    limit: query.limit ? parseInt(query.limit) : 50,
    offset: query.offset ? parseInt(query.offset) : 0,
  });

  return c.json(result);
});

// ===== GET /api/audit/stats =====
auditRouter.get("/stats", (c) => {
  ensureTables();
  const { getDb } = require("../db/schema");
  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) as c FROM audit_logs").get() as { c: number } | undefined)?.c || 0;

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count FROM audit_logs
    GROUP BY category ORDER BY count DESC
  `).all();

  const byLevel = db.prepare(`
    SELECT level, COUNT(*) as count FROM audit_logs
    GROUP BY level
  `).all();

  const recent = db.prepare(`
    SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 10
  `).all();

  // 今日统计
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = (db.prepare(
    "SELECT COUNT(*) as c FROM audit_logs WHERE createdAt >= ?"
  ).get(today) as { c: number } | undefined)?.c || 0;

  return c.json({ total, todayCount, byCategory, byLevel, recent });
});

// ===== POST /api/audit/cleanup =====
auditRouter.post("/cleanup", async (c) => {
  ensureTables();
  const body = await c.req.json().catch(() => ({})) as { retentionDays?: number };
  const days = body.retentionDays || 90;
  const deleted = auditLogger.cleanup(days);
  return c.json({ success: true, deleted, retentionDays: days });
});

export default auditRouter;
