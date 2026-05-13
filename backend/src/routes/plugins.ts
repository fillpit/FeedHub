/**
 * Nowen Note 插件管理 API
 *
 * - GET    /api/plugins          — 列出已加载的插件
 * - POST   /api/plugins/reload   — 重新扫描和加载所有插件
 * - POST   /api/plugins/:name/execute — 执行插件
 * - GET    /api/plugins/:name/logs    — 获取插件日志
 * - DELETE /api/plugins/:name         — 卸载插件
 * - GET    /api/plugins/actions       — 列出所有可用 action
 */

import { Hono } from "hono";
import { getPluginLoader } from "../plugins/plugin-loader.js";

const pluginsRouter = new Hono();

// 初始化：加载插件
let initialized = false;
async function ensureInit() {
  if (initialized) return;
  initialized = true;
  try {
    const loader = getPluginLoader();
    await loader.loadAll();
  } catch (err) {
    console.error("[Plugins] 初始化加载失败:", err);
  }
}

// ===== GET /api/plugins — 列出插件 =====
pluginsRouter.get("/", async (c) => {
  await ensureInit();
  const loader = getPluginLoader();
  return c.json(loader.listPlugins());
});

// ===== POST /api/plugins/reload — 重新加载 =====
pluginsRouter.post("/reload", async (c) => {
  const loader = getPluginLoader();
  await loader.loadAll();
  return c.json({ success: true, count: loader.listPlugins().length });
});

// ===== GET /api/plugins/actions — 列出所有 action =====
pluginsRouter.get("/actions", async (c) => {
  await ensureInit();
  const loader = getPluginLoader();
  const plugins = loader.listPlugins();

  const actions: { action: string; pluginName: string; description: string; params?: unknown[] }[] = [];
  for (const p of plugins) {
    if (p.status !== "active") continue;
    for (const cap of p.capabilities) {
      actions.push({
        action: cap.action,
        pluginName: p.name,
        description: cap.description,
        params: cap.params,
      });
    }
  }

  return c.json(actions);
});

// ===== POST /api/plugins/:name/execute — 执行插件 =====
pluginsRouter.post("/:name/execute", async (c) => {
  await ensureInit();
  const name = c.req.param("name");
  const userId = c.req.header("X-User-Id") || "demo";
  const params = await c.req.json();

  const loader = getPluginLoader();

  const result = await loader.executePlugin(
    name,
    params,
    {
      log: () => { /* no-op */ },
      userId,
      apiBaseUrl: "",
      apiToken: "",
    },
    30000,
  );

  if (!result.success) {
    return c.json(result, 400);
  }

  return c.json(result);
});

// ===== GET /api/plugins/:name/logs — 获取日志 =====
pluginsRouter.get("/:name/logs", async (c) => {
  await ensureInit();
  const name = c.req.param("name");
  const loader = getPluginLoader();
  return c.json(loader.getPluginLogs(name));
});

// ===== DELETE /api/plugins/:name — 卸载插件 =====
pluginsRouter.delete("/:name", async (c) => {
  const name = c.req.param("name");
  const loader = getPluginLoader();
  const result = await loader.unloadPlugin(name);
  return c.json({ success: result });
});

export default pluginsRouter;
