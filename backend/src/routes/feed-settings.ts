import { Hono } from "hono";
import { getDb } from "../db/schema";
import { getCacheService } from "../services/cache";

const router = new Hono();

const DEFAULTS: Record<string, string> = {
  feed_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  feed_cache_ttl: "3600",
  feed_proxy_enabled: "false",
  feed_bark_enabled: "false",
  feed_bark_url: "",
  feed_feishu_enabled: "false",
  feed_feishu_webhook: "",
  feed_notify_website_failure: "false",
  feed_notify_dynamic_failure: "false",
  feed_notify_npm_failure: "false",
};

// 获取设置
router.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'feed_%'").all() as { key: string; value: string }[];
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json(result);
});

// 保存设置
router.put("/", async (c) => {
  const body = await c.req.json<Record<string, string>>();
  const db = getDb();

  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, updatedAt)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = datetime('now')
  `);

  const tx = db.transaction(() => {
    for (const key of Object.keys(DEFAULTS)) {
      if (body[key] !== undefined) {
        upsert.run(key, body[key]);
      }
    }
  });
  tx();

  // 获取最新设置
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'feed_%'").all() as { key: string; value: string }[];
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json(result);
});

// 清空所有 Feed 缓存
router.post("/clear-cache", async (c) => {
  try {
    const cache = await getCacheService();
    await cache.deletePattern("website:*");
    await cache.deletePattern("dynamic:*");
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "清空缓存失败" }, 500);
  }
});

// 测试消息通道推送
router.post("/test-push", async (c) => {
  try {
    const { type, payload } = await c.req.json<{ type: "bark" | "feishu"; payload: Record<string, string> }>();
    if (type === "bark") {
      const serverUrl = payload.feed_bark_url;
      if (!serverUrl) return c.json({ error: "Bark URL 不能为空" }, 400);

      const target = `${serverUrl.replace(/\/$/, "")}/FeedHub/推送通道连通性测试?group=FeedHub`;
      const res = await fetch(target);
      if (!res.ok) throw new Error(`Bark Response: ${res.status}`);
    } else if (type === "feishu") {
      const webhook = payload.feed_feishu_webhook;
      if (!webhook) return c.json({ error: "飞书群 Webhook 不能为空" }, 400);

      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: { text: "【FeedHub】推送通道连通性测试成功！" },
        }),
      });
      if (!res.ok) throw new Error(`Feishu Response: ${res.status}`);
    } else {
      return c.json({ error: "不支持的通道类型" }, 400);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "推送测试出错" }, 500);
  }
});

export default router;
