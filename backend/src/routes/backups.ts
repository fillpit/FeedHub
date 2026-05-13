/**
 * 数据备份与恢复 API
 *
 * - GET    /api/backups            — 列出备份
 * - POST   /api/backups            — 创建备份
 * - GET    /api/backups/:filename/download — 下载备份
 * - POST   /api/backups/:filename/restore — 从备份恢复
 * - DELETE /api/backups/:filename  — 删除备份
 * - POST   /api/backups/auto       — 启动/停止自动备份
 */

import { Hono } from "hono";
import fs from "fs";
import { getBackupManager } from "../services/backup.js";

const backupsRouter = new Hono();

// ===== GET /api/backups =====
backupsRouter.get("/", (c) => {
  const manager = getBackupManager();
  return c.json(manager.listBackups());
});

// ===== POST /api/backups =====
backupsRouter.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { type?: "full" | "db-only"; description?: string };
  const manager = getBackupManager();

  try {
    const info = await manager.createBackup({
      type: body.type || "db-only",
      description: body.description,
    });
    return c.json(info, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: `备份失败: ${message}` }, 500);
  }
});

// ===== GET /api/backups/:filename/download =====
backupsRouter.get("/:filename/download", (c) => {
  const filename = c.req.param("filename");
  const manager = getBackupManager();
  const filePath = manager.getBackupPath(filename);

  if (!filePath) return c.json({ error: "备份不存在" }, 404);

  const content = fs.readFileSync(filePath);
  return new Response(content, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": content.length.toString(),
    },
  });
});

// ===== POST /api/backups/:filename/restore =====
backupsRouter.post("/:filename/restore", async (c) => {
  const filename = c.req.param("filename");
  const manager = getBackupManager();

  const result = await manager.restoreFromBackup(filename);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ success: true, stats: result.stats });
});

// ===== DELETE /api/backups/:filename =====
backupsRouter.delete("/:filename", (c) => {
  const filename = c.req.param("filename");
  const manager = getBackupManager();
  const result = manager.deleteBackup(filename);
  return c.json({ success: result });
});

// ===== POST /api/backups/auto =====
backupsRouter.post("/auto", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { enabled?: boolean; intervalHours?: number };
  const manager = getBackupManager();

  if (body.enabled === false) {
    manager.stopAutoBackup();
    return c.json({ success: true, message: "自动备份已停止" });
  }

  manager.startAutoBackup(body.intervalHours || 24);
  return c.json({ success: true, message: `自动备份已启动，间隔 ${body.intervalHours || 24} 小时` });
});

export default backupsRouter;
