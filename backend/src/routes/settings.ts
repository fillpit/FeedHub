import { Hono } from "hono";
import { getDb } from "../db/schema";
import { testRedisConnection, clearCacheServiceInstance } from "../services/cache";

const settings = new Hono();

export interface SiteSettings {
  site_title: string;
  site_favicon: string;
  editor_font_family: string;
  registration_policy: "open" | "invite" | "closed";
  redis_enabled?: string;
  redis_url?: string;
}

const DEFAULTS: SiteSettings = {
  site_title: "nowen-note",
  site_favicon: "",
  editor_font_family: "",
  registration_policy: "closed",
  redis_enabled: "0",
  redis_url: "redis://localhost:6379",
};

// 获取所有站点设置
settings.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy' OR key LIKE 'redis_%'").all() as { key: string; value: string }[];
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
    if (body.redis_enabled !== undefined) {
      upsert.run("redis_enabled", body.redis_enabled);
    }
    if (body.redis_url !== undefined) {
      upsert.run("redis_url", body.redis_url);
    }
  });
  tx();

  // 清除缓存服务实例，以便下次获取时重新加载配置
  clearCacheServiceInstance();

  // 返回更新后的全部设置
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy' OR key LIKE 'redis_%'").all() as { key: string; value: string }[];
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json(result);
});

// 测试 Redis 连接
settings.post("/redis/test", async (c) => {
  try {
    const body = await c.req.json() as { redis_url: string };
    if (!body.redis_url) {
      return c.json({ success: false, message: "Redis 地址不能为空" }, 400);
    }

    const result = await testRedisConnection(body.redis_url);
    return c.json(result);
  } catch (err: any) {
    return c.json({
      success: false,
      message: err.message || "连接失败"
    });
  }
});

export default settings;
