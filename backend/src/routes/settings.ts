import { Hono } from "hono";
import { getDb } from "../db/schema";
import { testRedisConnection, clearCacheServiceInstance } from "../services/cache";
import { testCdpConnection } from "../services/cdp";
import { BrowserlessFetcher } from "../services/browserless-fetcher";

const settings = new Hono();

export interface SiteSettings {
  site_title: string;
  site_favicon: string;
  editor_font_family: string;
  registration_policy: "open" | "invite" | "closed";
  redis_enabled?: string;
  redis_url?: string;
  cdp_enabled?: string;
  cdp_url?: string;
  browserless_enabled?: string;
  browserless_url?: string;
  browserless_token?: string;
  cloak_enabled?: string;
  cloak_url?: string;
  lightpanda_enabled?: string;
  lightpanda_url?: string;
}

const DEFAULTS: SiteSettings = {
  site_title: "FeedHub",
  site_favicon: "",
  editor_font_family: "",
  registration_policy: "closed",
  redis_enabled: "0",
  redis_url: "redis://localhost:6379",
  cdp_enabled: "0",
  cdp_url: "http://localhost:9222",
  browserless_enabled: "0",
  browserless_url: "http://localhost:3000",
  browserless_token: "",
  cloak_enabled: "0",
  cloak_url: "http://localhost:9122",
  lightpanda_enabled: "0",
  lightpanda_url: "http://localhost:9222",
};

// 获取所有站点设置
settings.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy' OR key LIKE 'redis_%' OR key LIKE 'cdp_%' OR key LIKE 'browserless_%' OR key LIKE 'cloak_%' OR key LIKE 'lightpanda_%'").all() as { key: string; value: string }[];
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
    if (body.cdp_enabled !== undefined) {
      upsert.run("cdp_enabled", body.cdp_enabled);
    }
    if (body.cdp_url !== undefined) {
      upsert.run("cdp_url", body.cdp_url);
    }
    if (body.browserless_enabled !== undefined) {
      upsert.run("browserless_enabled", body.browserless_enabled);
    }
    if (body.browserless_url !== undefined) {
      upsert.run("browserless_url", body.browserless_url);
    }
    if (body.browserless_token !== undefined) {
      upsert.run("browserless_token", body.browserless_token);
    }
    if (body.cloak_enabled !== undefined) {
      upsert.run("cloak_enabled", body.cloak_enabled);
    }
    if (body.cloak_url !== undefined) {
      upsert.run("cloak_url", body.cloak_url);
    }
    if (body.lightpanda_enabled !== undefined) {
      upsert.run("lightpanda_enabled", body.lightpanda_enabled);
    }
    if (body.lightpanda_url !== undefined) {
      upsert.run("lightpanda_url", body.lightpanda_url);
    }
  });
  tx();

  // 清除缓存服务实例，以便下次获取时重新加载配置
  clearCacheServiceInstance();

  // 返回更新后的全部设置
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy' OR key LIKE 'redis_%' OR key LIKE 'cdp_%' OR key LIKE 'browserless_%' OR key LIKE 'cloak_%' OR key LIKE 'lightpanda_%'").all() as { key: string; value: string }[];
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
  } catch (err: unknown) {
    return c.json({
      success: false,
      message: err instanceof Error ? err.message : "连接失败"
    });
  }
});

// 测试 CDP 连接
settings.post("/cdp/test", async (c) => {
  try {
    const body = await c.req.json() as { cdp_url: string };
    if (!body.cdp_url) {
      return c.json({ success: false, message: "CDP 地址不能为空" }, 400);
    }

    const result = await testCdpConnection(body.cdp_url);
    return c.json(result);
  } catch (err: unknown) {
    return c.json({
      success: false,
      message: err instanceof Error ? err.message : "连接失败"
    });
  }
});

// 测试 CloakBrowser 连接
settings.post("/cloak/test", async (c) => {
  try {
    const body = await c.req.json() as { cloak_url: string };
    if (!body.cloak_url) {
      return c.json({ success: false, message: "CloakBrowser 地址不能为空" }, 400);
    }

    const result = await testCdpConnection(body.cloak_url);
    return c.json(result);
  } catch (err: unknown) {
    return c.json({
      success: false,
      message: err instanceof Error ? err.message : "连接失败"
    });
  }
});

// 测试 Lightpanda 连接
settings.post("/lightpanda/test", async (c) => {
  try {
    const body = await c.req.json() as { lightpanda_url: string };
    if (!body.lightpanda_url) {
      return c.json({ success: false, message: "Lightpanda 地址不能为空" }, 400);
    }

    const result = await testCdpConnection(body.lightpanda_url);
    return c.json(result);
  } catch (err: unknown) {
    return c.json({
      success: false,
      message: err instanceof Error ? err.message : "连接失败"
    });
  }
});

// 测试 Browserless 连接
settings.post("/browserless/test", async (c) => {
  try {
    const body = await c.req.json() as { browserless_url: string; browserless_token?: string };
    if (!body.browserless_url) {
      return c.json({ success: false, message: "Browserless 地址不能为空" }, 400);
    }

    const fetcher = new BrowserlessFetcher(body.browserless_url, body.browserless_token || "");
    const { version } = await fetcher.testConnection();
    return c.json({
      success: true,
      message: `连接成功！Browserless 状态/版本: ${version}`
    });
  } catch (err: unknown) {
    return c.json({
      success: false,
      message: `无法连接至 Browserless 服务: ${err instanceof Error ? err.message : "连接失败"}`
    });
  }
});

export default settings;
