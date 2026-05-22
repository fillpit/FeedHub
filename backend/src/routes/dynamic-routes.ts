import { Hono } from "hono";
import { getDb } from "../db/schema";
import type { DynamicRoute, DynamicRouteCreate, DynamicRouteUpdate, FeedOutput } from "../types/feed";
import { runScript } from "../services/script-runner";
import { buildRssXml, buildJsonFeed } from "../services/rss-builder";
import {
  listScriptFiles,
  readScriptFile,
  writeScriptFile,
  deleteScriptFile,
  createScriptDirectory,
  deleteScriptDirectory,
  readReadme,
  extractZipFromBuffer,
  installDependencies,
} from "../services/script-file";
import { syncFromGithub } from "../services/github-sync";
import { getCacheService, buildCacheKey } from "../services/cache";

const router = new Hono();

// ─── CRUD ────────────────────────────────────────────────────────────────────

router.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM dynamic_routes ORDER BY createdAt DESC").all() as DynamicRoute[];
  const routes = rows.map(deserializeRoute);
  return c.json(routes);
});

router.get("/:id", (c) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM dynamic_routes WHERE id = ?").get(c.req.param("id")) as DynamicRoute | undefined;
  if (!row) return c.json({ error: "路由不存在" }, 404);
  return c.json(deserializeRoute(row));
});

router.post("/", async (c) => {
  const body = await c.req.json<DynamicRouteCreate>();
  validateRouteBody(body);

  const db = getDb();
  const existing = db.prepare("SELECT id FROM dynamic_routes WHERE path = ?").get(body.path);
  if (existing) return c.json({ error: "路由路径已存在" }, 400);

  const stmt = db.prepare(`
    INSERT INTO dynamic_routes (name, path, method, params, script, description, refreshInterval, authCredentialId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    body.name, body.path, body.method ?? "GET",
    JSON.stringify(body.params ?? []),
    JSON.stringify(body.script ?? { sourceType: "inline", folder: "", timeout: 30000 }),
    body.description ?? null,
    body.refreshInterval ?? 60,
    body.authCredentialId ?? null,
  );

  const created = db.prepare("SELECT * FROM dynamic_routes WHERE id = ?").get(result.lastInsertRowid) as DynamicRoute;
  return c.json(deserializeRoute(created), 201);
});

router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<DynamicRouteUpdate>();
  const db = getDb();

  const existing = db.prepare("SELECT * FROM dynamic_routes WHERE id = ?").get(id) as DynamicRoute | undefined;
  if (!existing) return c.json({ error: "路由不存在" }, 404);

  if (body.path && body.path !== existing.path) {
    const conflict = db.prepare("SELECT id FROM dynamic_routes WHERE path = ? AND id != ?").get(body.path, id);
    if (conflict) return c.json({ error: "路由路径已存在" }, 400);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  const fields = [
    ["name", body.name],
    ["path", body.path],
    ["method", body.method],
    ["params", body.params !== undefined ? JSON.stringify(body.params) : undefined],
    ["script", body.script !== undefined ? JSON.stringify(body.script) : undefined],
    ["description", body.description],
    ["refreshInterval", body.refreshInterval],
    ["authCredentialId", body.authCredentialId],
  ] as const;

  for (const [col, val] of fields) {
    if (val !== undefined) { updates.push(`${col} = ?`); params.push(val); }
  }

  if (updates.length === 0) return c.json({ error: "没有要更新的内容" }, 400);
  updates.push("updatedAt = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE dynamic_routes SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM dynamic_routes WHERE id = ?").get(id) as DynamicRoute;
  return c.json(deserializeRoute(updated));
});

router.delete("/:id", (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const row = db.prepare("SELECT script FROM dynamic_routes WHERE id = ?").get(id) as { script: string } | undefined;
  if (!row) return c.json({ error: "路由不存在" }, 404);

  const script = JSON.parse(row.script);
  if (script.folder) deleteScriptDirectory(script.folder);

  db.prepare("DELETE FROM dynamic_routes WHERE id = ?").run(id);
  return c.json({ success: true });
});

// ─── 脚本文件管理 ─────────────────────────────────────────────────────────────

router.get("/:id/files", (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json([]);
  return c.json(listScriptFiles(route.script.folder));
});

router.get("/:id/files/content", (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  const filePath = c.req.query("path") ?? "main.js";
  const content = readScriptFile(route.script.folder, filePath);
  return c.json({ content });
});

router.put("/:id/files/content", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  const { path: filePath, content } = await c.req.json<{ path: string; content: string }>();
  writeScriptFile(route.script.folder, filePath, content);
  return c.json({ success: true });
});

router.delete("/:id/files", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  const { path: filePath } = await c.req.json<{ path: string }>();
  if (filePath === "main.js" || filePath === "index.js") return c.json({ error: "不能删除入口文件" }, 400);
  deleteScriptFile(route.script.folder, filePath);
  return c.json({ success: true });
});

router.post("/:id/init-script", async (c) => {
  const id = c.req.param("id");
  const route = getRouteOrFail(id);
  if (!route) return c.json({ error: "路由不存在" }, 404);

  if (route.script.folder) deleteScriptDirectory(route.script.folder);

  const folderName = createScriptDirectory(route.name);
  const db = getDb();
  const newScript = { ...route.script, folder: folderName };
  db.prepare("UPDATE dynamic_routes SET script = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(JSON.stringify(newScript), id);

  return c.json({ folder: folderName });
});

router.get("/:id/readme", (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json({ content: "" });
  const content = readReadme(route.script.folder) ?? "";
  return c.json({ content });
});

router.put("/:id/readme", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  const { content } = await c.req.json<{ content: string }>();
  writeScriptFile(route.script.folder, "README.md", content);
  return c.json({ success: true });
});

router.post("/:id/github-sync", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json({ error: "脚本未初始化" }, 400);

  const { githubConfig } = route.script;
  if (!githubConfig) return c.json({ error: "未配置 GitHub 同步信息" }, 400);

  try {
    await syncFromGithub(route.script.folder, githubConfig);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

router.post("/:id/upload", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json({ error: "脚本未初始化" }, 400);

  const body = await c.req.parseBody();
  const file = body["file"] as File;
  if (!file) return c.json({ error: "未上传文件" }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    extractZipFromBuffer(route.script.folder, buffer);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

router.post("/:id/install-deps", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json({ error: "脚本未初始化" }, 400);

  try {
    await installDependencies(route.script.folder);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

router.post("/:id/npm-install", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json({ error: "脚本未初始化" }, 400);

  const { exec } = await import("node:child_process");
  const util = await import("node:util");
  const path = await import("node:path");
  const { SCRIPTS_BASE_DIR } = await import("../services/script-runner");
  const execAsync = util.promisify(exec);

  const scriptDir = path.join(SCRIPTS_BASE_DIR, route.script.folder);
  try {
    const { stdout, stderr } = await execAsync("npm install", { cwd: scriptDir, timeout: 60000 });
    return c.json({ success: true, logs: stdout + "\n" + stderr });
  } catch (err: unknown) {
    const error = err as Record<string, unknown>;
    const stdout = typeof error.stdout === "string" ? error.stdout : "";
    const stderr = typeof error.stderr === "string" ? error.stderr : "";
    const message = typeof error.message === "string" ? error.message : "Unknown error";
    return c.json({ success: false, logs: stdout + "\n" + stderr + "\n" + message }, 500);
  }
});

router.post("/:id/import-rsshub", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json({ error: "脚本未初始化" }, 400);

  const { rsshubRoute } = await c.req.json<{ rsshubRoute: string }>();
  if (!rsshubRoute) return c.json({ error: "未提供 RSSHub 路由" }, 400);

  const { findRsshubRouteFile } = await import("../services/rsshub");
  const match = await findRsshubRouteFile(rsshubRoute);

  if (!match) {
    return c.json({ error: "在本地 RSSHub 代码库中未找到对应的路由源文件" }, 404);
  }

  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'ai_%'").all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;

  const apiUrl = (settings.ai_chat_api_url || settings.ai_api_url || "").replace(/\/+$/, "");
  const apiKey = settings.ai_chat_api_key || settings.ai_api_key;
  const model = settings.ai_chat_model || settings.ai_model || "gpt-4o-mini";

  if (!apiUrl) {
    return c.json({ error: "未配置 AI API 地址" }, 400);
  }

  const prompt = `你是一个专业的 TypeScript/JavaScript 开发工程师。
用户希望将以下 RSSHub 的源文件（路径：${match.filePath}）转换为 FeedHub 的独立抓取脚本。
由于 FeedHub 支持完整的 Node 原生 \`vm\` 环境以及 npm 模块，你可以保留 cheerio、got、ofetch 等常见包的使用，但请直接在一份 main.js 文件中输出转换后的完整可用代码。

要求：
1. 移除对 RSSHub 特有上下文（如 ctx.cache, ctx.state.data 等）的依赖，直接调用目标网站 API 或爬取网页。
2. 提取出原文件中的请求逻辑（fetch/got/axios）、解析逻辑（cheerio/json）。
3. FeedHub 脚本最后必须将结果作为数组或包含 title, link, items 的对象 \`return\` 出去。每个 item 包含 title, link, description/content, pubDate 等字段。
4. 提供代码时，请将其包裹在 \`\`\`javascript 和 \`\`\` 之间，不需要多余的解释说明。

RSSHub 源码：
\`\`\`javascript
${match.content.slice(0, 8000)} // 截断以防止过长
\`\`\`
`;

  try {
    const res = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return c.json({ error: `AI 服务返回错误: ${res.status} ${errTxt.slice(0, 200)}` }, 502);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // 提取 ```javascript ... ``` 块
    const codeMatch = content.match(/```(?:javascript|js|typescript|ts)\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : content.trim();

    writeScriptFile(route.script.folder, "main.js", code);
    return c.json({ success: true, code, message: "已通过 AI 生成代码并覆盖 main.js" });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : "AI 转换失败" }, 500);
  }
});

// ─── 调试 ──────────────────────────────────────────────────────────────────

router.post("/:id/debug", async (c) => {
  const route = getRouteOrFail(c.req.param("id"));
  if (!route) return c.json({ error: "路由不存在" }, 404);
  if (!route.script.folder) return c.json({ error: "脚本未初始化" }, 400);

  const body = await c.req.json<{ params?: Record<string, string>; routeParams?: Record<string, string> }>().catch(() => ({ params: undefined, routeParams: undefined }));
  const result = await runScript({
    scriptFolder: route.script.folder,
    context: { params: body.params ?? {}, routeParams: body.routeParams ?? {} },
    timeoutMs: route.script.timeout ?? 30000,
  });

  return c.json(result);
});

// ─── 工具函数 ───────────────────────────────────────────────────────────────

function getRouteOrFail(id: string): (DynamicRoute & { script: { folder: string; timeout: number } }) | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM dynamic_routes WHERE id = ?").get(id) as DynamicRoute | undefined;
  if (!row) return null;
  return deserializeRoute(row) as DynamicRoute & { script: { folder: string; timeout: number } };
}

function deserializeRoute(row: DynamicRoute): DynamicRoute {
  return {
    ...row,
    params: typeof row.params === "string" ? JSON.parse(row.params) : row.params,
    script: typeof row.script === "string" ? JSON.parse(row.script) : row.script,
  };
}

function validateRouteBody(body: DynamicRouteCreate): void {
  if (!body.name) throw new Error("路由名称不能为空");
  if (!body.path) throw new Error("路由路径不能为空");
  if (!body.path.startsWith("/")) throw new Error("路由路径必须以 / 开头");
}

// ─── 公开 Feed 输出（在 index.ts 中注册，不需要 JWT） ────────────────────────

interface UpdateRouteStatusParams {
  readonly routeId: number;
  readonly isSuccess: boolean;
  readonly error: string | null;
}

function updateRouteStatus(params: UpdateRouteStatusParams): void {
  const db = getDb();
  const statusUpdate = params.isSuccess ? "success" : "failure";
  db.prepare("UPDATE dynamic_routes SET lastRunAt = datetime('now'), lastRunStatus = ?, lastRunError = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(statusUpdate, params.error, params.routeId);
}

interface FormatFeedParams {
  readonly data: FeedOutput;
  readonly type: "rss" | "json";
  readonly selfUrl: string;
}

function formatFeed(params: FormatFeedParams): string {
  return params.type === "json"
    ? JSON.stringify(buildJsonFeed(params.data, params.selfUrl))
    : buildRssXml(params.data, params.selfUrl);
}

interface CacheFeedParams {
  readonly cacheKey: string;
  readonly type: "rss" | "json";
}

async function getCachedFeed(params: CacheFeedParams): Promise<Response | null> {
  const cache = await getCacheService();
  const cached = await cache.get(params.cacheKey);
  if (!cached) return null;
  return new Response(cached, { headers: contentTypeHeader(params.type) });
}

interface MatchSegResult {
  readonly isMatched: boolean;
  readonly name?: string;
  readonly val?: string;
}

function matchSegment(patSeg: string, pathSeg: string | undefined): MatchSegResult {
  if (patSeg.startsWith(":")) {
    const isOptional = patSeg.endsWith("?");
    const name = isOptional ? patSeg.slice(1, -1) : patSeg.slice(1);
    if (pathSeg === undefined) {
      return { isMatched: isOptional };
    }
    return { isMatched: true, name, val: pathSeg };
  }
  return { isMatched: patSeg === pathSeg };
}

interface MatchPathResult {
  readonly isMatched: boolean;
  readonly routeParams: Record<string, string>;
}

function matchPath(pattern: string, path: string): MatchPathResult {
  const patternSegments = pattern.split("/");
  const pathSegments = path.split("/");
  const routeParams: Record<string, string> = {};
  const maxLen = Math.max(patternSegments.length, pathSegments.length);

  for (let i = 0; i < maxLen; i++) {
    const patSeg = patternSegments[i];
    if (patSeg === undefined) return { isMatched: false, routeParams: {} };
    const res = matchSegment(patSeg, pathSegments[i]);
    if (!res.isMatched) return { isMatched: false, routeParams: {} };
    if (res.name && res.val) routeParams[res.name] = res.val;
  }

  return { isMatched: true, routeParams };
}

interface FindRouteResult {
  readonly matchedRow: DynamicRoute | null;
  readonly routeParams: Record<string, string>;
}

function findMatchedRoute(routePath: string): FindRouteResult {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM dynamic_routes").all() as DynamicRoute[];
  for (const row of rows) {
    const { isMatched, routeParams } = matchPath(row.path, routePath);
    if (isMatched) {
      return { matchedRow: row, routeParams };
    }
  }
  return { matchedRow: null, routeParams: {} };
}

export async function handleDynamicFeed(c: import("hono").Context): Promise<Response> {
  const prefix = "/api/dynamic/sub";
  const routePath = c.req.path.slice(prefix.length);
  const type = (c.req.query("type") ?? "rss") as "rss" | "json";
  const { matchedRow, routeParams } = findMatchedRoute(routePath);
  if (!matchedRow) return c.json({ error: "路由不存在" }, 404);

  const route = deserializeRoute(matchedRow);
  if (!route.script.folder) return c.json({ error: "脚本未初始化" }, 400);

  const queryParams = Object.fromEntries(new URL(c.req.url).searchParams);
  const cacheKey = buildCacheKey(`route:${routePath}`, queryParams);
  const cachedResponse = await getCachedFeed({ cacheKey, type });
  if (cachedResponse) return cachedResponse;

  const result = await runScript({
    scriptFolder: route.script.folder,
    context: { params: queryParams, routeParams },
    timeoutMs: route.script.timeout ?? 30000,
  });

  updateRouteStatus({
    routeId: matchedRow.id,
    isSuccess: result.success,
    error: result.error ?? null,
  });

  if (!result.success || !result.data) {
    return c.json({ error: result.error ?? "执行失败" }, 500);
  }

  const output = formatFeed({ data: result.data, type, selfUrl: c.req.url });
  const cache = await getCacheService();
  await cache.set(cacheKey, output, route.refreshInterval * 60);

  return new Response(output, { headers: contentTypeHeader(type) });
}

function contentTypeHeader(type: "rss" | "json"): Record<string, string> {
  return {
    "Content-Type": type === "json" ? "application/feed+json; charset=utf-8" : "application/rss+xml; charset=utf-8",
  };
}

export default router;
