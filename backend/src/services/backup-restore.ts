import type Database from "better-sqlite3";

export const ALLOWED_TABLES = [
  "users",
  "custom_fonts",
  "system_settings",
  "dynamic_routes",
  "website_rss_configs",
  "auth_credentials",
] as const;

export function isSqliteFile(buffer: Buffer): boolean {
  return buffer.length >= 15 && buffer.subarray(0, 15).toString("utf-8") === "SQLite format 3";
}

export async function restoreSqlite(
  filePath: string,
  db: Database.Database
): Promise<Record<string, number>> {
  const { default: DatabaseImpl } = await import("better-sqlite3");
  const backupDb = new DatabaseImpl(filePath, { readonly: true });
  try {
    // 绕过第三方库定义限制，进行热还原
    await backupDb.backup(db as unknown as string);
  } finally {
    backupDb.close();
  }
  const stats: Record<string, number> = {};
  for (const table of ALLOWED_TABLES) {
    try {
      const countResult = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number } | undefined;
      stats[table] = countResult?.c ?? 0;
    } catch {
      stats[table] = 0;
    }
  }
  return stats;
}

export function restoreFullJson(
  content: string,
  db: Database.Database
): Record<string, number> {
  const backup = JSON.parse(content) as { version?: string; data?: Record<string, unknown[]> };
  if (!backup.data || !backup.version) {
    throw new Error("不是有效的全量备份文件");
  }
  const stats: Record<string, number> = {};
  const restoreTx = db.transaction(() => {
    for (const [table, rows] of Object.entries(backup.data || {})) {
      if (!Array.isArray(rows) || rows.length === 0 || !(ALLOWED_TABLES as readonly string[]).includes(table)) {
        continue;
      }
      try {
        db.prepare(`DELETE FROM ${table}`).run();
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
        console.warn(`[Backup] 恢复表 ${table} 失败:`, err instanceof Error ? err.message : String(err));
      }
    }
  });
  restoreTx();
  return stats;
}
