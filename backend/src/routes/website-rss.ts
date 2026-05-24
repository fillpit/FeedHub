import { Hono } from "hono";
import { getDb } from "../db/schema";
import type { WebsiteRssConfig, WebsiteRssCreate, WebsiteRssUpdate } from "../types/feed";
import { scrapeWebsite, buildAuthHeaders } from "../services/html-scraper";
import { buildRssXml, buildJsonFeed } from "../services/rss-builder";
import { getCacheService, buildCacheKey } from "../services/cache";
import { nanoid } from "../utils/nanoid";
import { fetchSiteMeta } from "../services/site-meta";

const router = new Hono();

// ─── CRUD ────────────────────────────────────────────────────────────────────

router.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM website_rss_configs ORDER BY createdAt DESC").all() as WebsiteRssConfig[];
  return c.json(rows.map(deserialize));
});

router.get("/:id", (c) => {
  const row = findOrNull(c.req.param("id"));
  if (!row) return c.json({ error: "配置不存在" }, 404);
  return c.json(row);
});

router.post("/", async (c) => {
  const body = await c.req.json<WebsiteRssCreate>();
  if (!body.title) return c.json({ error: "网站名称不能为空" }, 400);
  if (!body.url) return c.json({ error: "网站 URL 不能为空" }, 400);

  const db = getDb();
  const key = body.key?.trim() || nanoid(8);
  const stmt = db.prepare(`
    INSERT INTO website_rss_configs
      (key, title, url, selector, renderMode, authCredentialId, fetchInterval, rssDescription, favicon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    key, body.title, body.url,
    JSON.stringify(body.selector ?? {}),
    body.renderMode ?? "static",
    body.authCredentialId ?? null,
    body.fetchInterval ?? 60,
    body.rssDescription ?? null,
    body.favicon ?? null,
  );

  const created = db.prepare("SELECT * FROM website_rss_configs WHERE id = ?").get(result.lastInsertRowid) as WebsiteRssConfig;
  return c.json(deserialize(created), 201);
});

router.put("/:id", async (c) => {
  const id = c.req.param("id");
  if (!findOrNull(id)) return c.json({ error: "配置不存在" }, 404);

  const body = await c.req.json<WebsiteRssUpdate>();
  const updates: string[] = [];
  const params: unknown[] = [];

  const fields = [
    ["title", body.title],
    ["url", body.url],
    ["selector", body.selector !== undefined ? JSON.stringify(body.selector) : undefined],
    ["renderMode", body.renderMode],
    ["authCredentialId", body.authCredentialId],
    ["fetchInterval", body.fetchInterval],
    ["rssDescription", body.rssDescription],
    ["favicon", body.favicon],
  ] as const;

  for (const [col, val] of fields) {
    if (val !== undefined) { updates.push(`${col} = ?`); params.push(val); }
  }

  if (updates.length === 0) return c.json({ error: "没有要更新的内容" }, 400);
  updates.push("updatedAt = datetime('now')");
  params.push(id);

  getDb().prepare(`UPDATE website_rss_configs SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  const updated = getDb().prepare("SELECT * FROM website_rss_configs WHERE id = ?").get(id) as WebsiteRssConfig;
  return c.json(deserialize(updated));
});

router.delete("/:id", (c) => {
  const id = c.req.param("id");
  if (!findOrNull(id)) return c.json({ error: "配置不存在" }, 404);
  getDb().prepare("DELETE FROM website_rss_configs WHERE id = ?").run(id);
  return c.json({ success: true });
});

// ─── 调试选择器 ─────────────────────────────────────────────────────────────

router.post("/fetch-meta", async (c) => {
  try {
    const { url } = await c.req.json<{ url: string }>();
    if (!url) {
      return c.json({ error: "URL 不能为空" }, 400);
    }
    const meta = await fetchSiteMeta(url);
    return c.json({ success: true, data: meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取网站信息失败";
    return c.json({ error: message }, 500);
  }
});

router.post("/debug-ad-hoc", async (c) => {
  try {
    const body = await c.req.json<{ url: string; selector: import("../types/feed").WebsiteRssSelector; authCredentialId?: number }>();
    if (!body.url) return c.json({ error: "网站 URL 不能为空" }, 400);
    if (!body.selector) return c.json({ error: "选择器配置不能为空" }, 400);

    let authHeaders: Record<string, string> = {};
    if (body.authCredentialId) {
      const db = getDb();
      const cred = db.prepare("SELECT authType, credential FROM auth_credentials WHERE id = ?").get(body.authCredentialId) as { authType: string; credential: string } | undefined;
      if (cred) {
        const credential = typeof cred.credential === "string" ? JSON.parse(cred.credential) : cred.credential;
        authHeaders = await buildAuthHeaders(credential, cred.authType);
      }
    }

    const result = await scrapeWebsite({ url: body.url, selector: body.selector, authHeaders, debug: true });
    return c.json({ ...result, success: !result.error, url: body.url, selectorType: body.selector.selectorType });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "调试出错" }, 500);
  }
});

router.post("/:id/debug", async (c) => {
  const row = findOrNull(c.req.param("id"));
  if (!row) return c.json({ error: "配置不存在" }, 404);

  const authHeaders = await resolveAuthHeaders(row);
  const result = await scrapeWebsite({ url: row.url, selector: row.selector, authHeaders, debug: true });
  return c.json({ ...result, success: !result.error, url: row.url, selectorType: row.selector.selectorType });
});

// ─── 手动刷新 ───────────────────────────────────────────────────────────────

router.post("/:id/refresh", async (c) => {
  const id = c.req.param("id");
  const row = findOrNull(id);
  if (!row) return c.json({ error: "配置不存在" }, 404);

  const authHeaders = await resolveAuthHeaders(row);
  const { items, error } = await scrapeWebsite({ url: row.url, selector: row.selector, authHeaders });

  const numId = Number(id);
  if (error) {
    updateFetchStatus({ id: numId, status: "failure", error });
    return c.json({ success: false, error }, 500);
  }

  const feedData = { title: row.title, description: row.rssDescription, link: row.url, items };
  const feedJson = JSON.stringify(feedData);
  updateFetchStatus({ id: numId, status: "success", content: feedJson });

  const cache = await getCacheService();
  await cache.deletePattern(`website:${row.key}:*`);

  return c.json({ success: true, itemCount: items.length });
});

// ─── 工具函数 ───────────────────────────────────────────────────────────────

function findOrNull(id: string): WebsiteRssConfig | null {
  const row = getDb().prepare("SELECT * FROM website_rss_configs WHERE id = ?").get(id) as WebsiteRssConfig | undefined;
  return row ? deserialize(row) : null;
}

function deserialize(row: WebsiteRssConfig): WebsiteRssConfig {
  return {
    ...row,
    selector: typeof row.selector === "string" ? JSON.parse(row.selector) : row.selector,
  };
}

async function resolveAuthHeaders(config: WebsiteRssConfig): Promise<Record<string, string>> {
  if (!config.authCredentialId) return {};
  const db = getDb();
  const cred = db.prepare("SELECT authType, credential FROM auth_credentials WHERE id = ?").get(config.authCredentialId) as { authType: string; credential: string } | undefined;
  if (!cred) return {};
  const credential = typeof cred.credential === "string" ? JSON.parse(cred.credential) : cred.credential;
  return buildAuthHeaders(credential, cred.authType);
}

interface FetchStatusUpdate {
  readonly id: number;
  readonly status: "success" | "failure";
  readonly error?: string;
  readonly content?: string;
}

function updateFetchStatus(params: FetchStatusUpdate): void {
  const db = getDb();
  const now = new Date().toISOString();
  if (params.status === "failure") {
    db.prepare("UPDATE website_rss_configs SET lastFetchStatus = ?, lastFetchError = ?, lastFetchTime = ?, updatedAt = ? WHERE id = ?")
      .run("failure", params.error ?? null, now, now, params.id);
  } else {
    db.prepare("UPDATE website_rss_configs SET lastContent = ?, lastFetchStatus = ?, lastFetchError = NULL, lastFetchTime = ?, updatedAt = ? WHERE id = ?")
      .run(params.content ?? null, "success", now, now, params.id);
  }
}

// ─── 公开 Feed 输出 ───────────────────────────────────────────────────────────

export async function handleWebsiteFeed(c: import("hono").Context): Promise<Response> {
  const key = c.req.param("key");
  const type = (c.req.query("type") ?? "rss") as "rss" | "json";
  const db = getDb();

  const row = db.prepare("SELECT * FROM website_rss_configs WHERE key = ?").get(key) as WebsiteRssConfig | undefined;
  if (!row) return c.json({ error: "配置不存在" }, 404);

  const config = deserialize(row);
  const cache = await getCacheService();
  const cacheKey = buildCacheKey(`website:${key}`, { type });
  const cached = await cache.get(cacheKey);
  if (cached) return new Response(cached, { headers: contentTypeHeader(type) });

  const authHeaders = await resolveAuthHeaders(config);
  const { items, error } = await scrapeWebsite({ url: config.url, selector: config.selector, authHeaders });

  if (error) {
    updateFetchStatus({ id: config.id, status: "failure", error });
    return c.json({ error }, 500);
  }

  const feedData = { title: config.title, description: config.rssDescription, link: config.url, items };
  const feedJson = JSON.stringify(feedData);
  updateFetchStatus({ id: config.id, status: "success", content: feedJson });

  const output = type === "json"
    ? JSON.stringify(buildJsonFeed(feedData, c.req.url))
    : buildRssXml(feedData, c.req.url);

  await cache.set(cacheKey, output, config.fetchInterval * 60);
  return new Response(output, { headers: contentTypeHeader(type) });
}

function contentTypeHeader(type: "rss" | "json"): Record<string, string> {
  return {
    "Content-Type": type === "json" ? "application/feed+json; charset=utf-8" : "application/rss+xml; charset=utf-8",
  };
}

export default router;
