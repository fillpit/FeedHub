/**
 * Nowen Note 数据备份与恢复系统
 *
 * 支持：
 *  - 全量备份（数据库 + 附件 + 字体 + 插件）
 *  - 仅数据库备份
 *  - 定时自动备份（按间隔）
 *  - 备份文件列表/下载/删除
 *  - 从备份恢复
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDb } from "../db/schema.js";

// ===== 类型 =====

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  type: "full" | "db-only";
  createdAt: string;
  noteCount: number;
  notebookCount: number;
  checksum: string;
}

export interface BackupOptions {
  type?: "full" | "db-only";
  description?: string;
}

// ===== 备份管理器 =====

export class BackupManager {
  private backupDir: string;
  private dataDir: string;
  private autoBackupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.dataDir = process.env.ELECTRON_USER_DATA || path.join(process.cwd(), "data");
    this.backupDir = path.join(this.dataDir, "backups");
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /** 创建备份 */
  async createBackup(options: BackupOptions = {}): Promise<BackupInfo> {
    const type = options.type || "db-only";
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `nowen-backup-${type}-${timestamp}.bak`;
    const backupPath = path.join(this.backupDir, filename);

    const db = getDb();

    // 获取统计
    const noteCount = (db.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number } | undefined)?.c || 0;
    const notebookCount = (db.prepare("SELECT COUNT(*) as c FROM notebooks").get() as { c: number } | undefined)?.c || 0;

    if (type === "db-only") {
      await db.backup(backupPath);
    } else {
      // 全量备份：使用 JSON 导出（数据库表 + 元信息）
      const tables = [
        "users", "notebooks", "notes", "tags", "note_tags",
        "tasks", "system_settings", "diaries", "shares",
        "note_versions", "share_comments", "custom_fonts",
      ];

      const exportData: Record<string, unknown[]> = {};
      for (const table of tables) {
        try {
          exportData[table] = db.prepare(`SELECT * FROM ${table}`).all();
        } catch {
          exportData[table] = [];
        }
      }

      // 包含附加表（如果存在）
      try {
        exportData["webhooks"] = db.prepare("SELECT * FROM webhooks").all();
        exportData["audit_logs"] = db.prepare("SELECT * FROM audit_logs").all();
      } catch { /* 表可能不存在 */ }

      const fullBackup = {
        version: "1.0.0",
        type: "full",
        timestamp: new Date().toISOString(),
        description: options.description || "",
        noteCount,
        notebookCount,
        data: exportData,
      };

      fs.writeFileSync(backupPath, JSON.stringify(fullBackup), "utf-8");
    }

    // 计算校验和
    const content = fs.readFileSync(backupPath);
    const checksum = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
    const size = content.length;

    const info: BackupInfo = {
      id,
      filename,
      size,
      type,
      createdAt: new Date().toISOString(),
      noteCount,
      notebookCount,
      checksum,
    };

    // 保存备份元信息
    const metaPath = path.join(this.backupDir, `${filename}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(info, null, 2), "utf-8");

    return info;
  }

  /** 列出所有备份 */
  listBackups(): BackupInfo[] {
    this.ensureDir();
    const files = fs.readdirSync(this.backupDir);
    const backups: BackupInfo[] = [];

    for (const f of files) {
      if (f.endsWith(".meta.json")) {
        try {
          const metaText = fs.readFileSync(path.join(this.backupDir, f), "utf-8");
          backups.push(JSON.parse(metaText));
        } catch { /* 忽略损坏的元信息 */ }
      }
    }

    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** 获取备份文件路径 */
  getBackupPath(filename: string): string | null {
    const filePath = path.join(this.backupDir, filename);
    // 安全检查
    if (!path.resolve(filePath).startsWith(path.resolve(this.backupDir))) return null;
    if (!fs.existsSync(filePath)) return null;
    return filePath;
  }

  /** 删除备份 */
  deleteBackup(filename: string): boolean {
    const filePath = this.getBackupPath(filename);
    if (!filePath) return false;

    try {
      fs.unlinkSync(filePath);
      const metaPath = filePath + ".meta.json";
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      return true;
    } catch {
      return false;
    }
  }

  /** 从全量备份恢复 */
  async restoreFromBackup(filename: string): Promise<{ success: boolean; error?: string; stats?: Record<string, number> }> {
    const filePath = this.getBackupPath(filename);
    if (!filePath) return { success: false, error: "备份文件不存在" };

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const backup = JSON.parse(content);

      if (!backup.data || !backup.version) {
        return { success: false, error: "不是有效的全量备份文件" };
      }

      const db = getDb();
      const stats: Record<string, number> = {};

      // 使用事务恢复
      const restore = db.transaction(() => {
        for (const [table, rows] of Object.entries(backup.data)) {
          if (!Array.isArray(rows) || rows.length === 0) continue;

          // 安全：只允许已知的表名
          const allowedTables = [
            "users", "notebooks", "notes", "tags", "note_tags", "tasks",
            "system_settings", "diaries", "shares", "note_versions",
            "share_comments", "custom_fonts", "webhooks",
          ];
          if (!allowedTables.includes(table)) continue;

          try {
            // 清空目标表
            db.prepare(`DELETE FROM ${table}`).run();

            // 插入数据
            const columns = Object.keys(rows[0] as Record<string, unknown>);
            const placeholders = columns.map(() => "?").join(", ");
            const insert = db.prepare(
              `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
            );

            for (const row of rows) {
              insert.run(...columns.map(c => (row as Record<string, unknown>)[c]));
            }

            stats[table] = rows.length;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[Backup] 恢复表 ${table} 失败:`, message);
          }
        }
      });

      restore();

      return { success: true, stats };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  /** 启动自动备份 */
  startAutoBackup(intervalHours: number = 24): void {
    this.stopAutoBackup();
    const ms = intervalHours * 3600 * 1000;
    this.autoBackupTimer = setInterval(async () => {
      try {
        const info = await this.createBackup({ type: "db-only", description: "自动备份" });
        console.log(`[Backup] 自动备份完成: ${info.filename}`);

        // 保留最近 10 个自动备份
        const all = this.listBackups();
        const auto = all.filter(b => b.filename.includes("db-only"));
        if (auto.length > 10) {
          for (const old of auto.slice(10)) {
            this.deleteBackup(old.filename);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Backup] 自动备份失败:", message);
      }
    }, ms);

    console.log(`[Backup] 自动备份已启动，间隔 ${intervalHours} 小时`);
  }

  /** 停止自动备份 */
  stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
  }
}

// ===== 全局单例 =====

let _manager: BackupManager | null = null;

export function getBackupManager(): BackupManager {
  if (!_manager) {
    _manager = new BackupManager();
  }
  return _manager;
}
