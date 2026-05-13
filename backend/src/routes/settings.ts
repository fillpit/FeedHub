import { Hono } from "hono";
import { getDb } from "../db/schema";

const settings = new Hono();

export interface SiteSettings {
  site_title: string;
  site_favicon: string;
  editor_font_family: string;
  registration_policy: "open" | "invite" | "closed";
}

const DEFAULTS: SiteSettings = {
  site_title: "nowen-note",
  site_favicon: "",
  editor_font_family: "",
  registration_policy: "closed",
};

// 获取所有站点设置
settings.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy'").all() as { key: string; value: string }[];
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json(result);
});

// 更新站点设置
settings.put("/", async (c) => {
  const body = await c.req.json() as Partial<SiteSettings>;
  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, updatedAt)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = datetime('now')
  `);

  const tx = db.transaction(() => {
    if (body.site_title !== undefined) {
      upsert.run("site_title", body.site_title.trim().slice(0, 20));
    }
    if (body.site_favicon !== undefined) {
      upsert.run("site_favicon", body.site_favicon);
    }
    if (body.editor_font_family !== undefined) {
      upsert.run("editor_font_family", body.editor_font_family);
    }
    if (body.registration_policy !== undefined) {
      upsert.run("registration_policy", body.registration_policy);
    }
  });
  tx();

  // 返回更新后的全部设置
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy'").all() as { key: string; value: string }[];
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json(result);
});

export default settings;
