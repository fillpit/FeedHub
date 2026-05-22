import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import aiRouter from "./routes/ai";
import pluginsRouter from "./routes/plugins";
import auditRouter from "./routes/audit";
import backupsRouter from "./routes/backups";
import authRouter, { JWT_SECRET } from "./routes/auth";
import { seedDatabase } from "./db/seed";
import { getDb } from "./db/schema";
import { generateOpenAPISpec } from "./services/openapi";
import dynamicRoutesRouter, { handleDynamicFeed } from "./routes/dynamic-routes";
import websiteRssRouter, { handleWebsiteFeed } from "./routes/website-rss";
import authCredentialsRouter from "./routes/auth-credentials";
import npmPackagesRouter from "./routes/npm-packages";

const app = new Hono();

app.use("*", logger());
app.use("*", cors({
  origin: (origin) => origin || "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "X-User-Id", "Authorization"],
  credentials: true,
}));

// 初始化数据库
getDb();
seedDatabase();

// 认证路由（无需 JWT）
app.route("/api/auth", authRouter);



// 健康检查（无需 JWT）
app.get("/api/health", (c) => c.json({ status: "ok", version: "1.0.0" }));

// OpenAPI 规范（无需 JWT）
app.get("/api/openapi.json", (c) => c.json(generateOpenAPISpec()));

// Feed 输出端点（无需 JWT，供 RSS 阅读器使用）
app.get("/api/dynamic/sub/*", (c) => handleDynamicFeed(c));
app.get("/api/website/sub/:key", (c) => handleWebsiteFeed(c));

// 站点设置（GET 无需 JWT，允许未登录时加载品牌信息；已登录用户返回完整配置）
app.get("/api/settings", (c) => {
  const db = getDb();
  
  // 检查是否有合法的登录 Token
  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;
  
  let isAuthenticated = false;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      // 忽略无效 token，只作为未登录处理
    }
  }

  const result: Record<string, string> = {
    site_title: "nowen-note",
    site_favicon: "",
    editor_font_family: "",
    registration_policy: "closed"
  };

  if (isAuthenticated) {
    // 已登录用户，返回完整配置
    const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy' OR key LIKE 'redis_%' OR key LIKE 'cdp_%' OR key LIKE 'browserless_%' OR key LIKE 'cloak_%'").all() as { key: string; value: string }[];
    for (const row of rows) {
      result[row.key] = row.value;
    }
  } else {
    // 未登录用户，只返回公共的非敏感配置
    const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'site_%' OR key LIKE 'editor_%' OR key = 'registration_policy'").all() as { key: string; value: string }[];
    for (const row of rows) {
      result[row.key] = row.value;
    }
  }
  
  return c.json(result);
});

// 健康检查接口（用于 Docker Healthcheck）
app.get("/health", (c) => c.json({ status: "ok" }));

// 健康检查（无需 JWT）
app.get("/api/health", (c) => c.json({ status: "ok", version: "1.0.0" }));


// JWT 鉴权中间件：保护所有 /api/* 路由（auth 和 health 已在上方注册，不受影响）
app.use("/api/*", async (c, next) => {
  const reqPath = c.req.path;
  if (reqPath.startsWith("/api/dynamic/sub/") || reqPath.startsWith("/api/website/sub/")) {
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  const queryToken = c.req.query("token");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : queryToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      c.req.raw.headers.set("X-User-Id", decoded.userId);
    } catch {
      return c.json({ error: "Token 无效或已过期" }, 401);
    }
  } else {
    return c.json({ error: "未授权，请先登录" }, 401);
  }

  await next();
});

import settingsRouter from "./routes/settings";
import usersRouter from "./routes/users";

// API 路由（受 JWT 保护）
app.route("/api/ai", aiRouter);
app.route("/api/plugins", pluginsRouter);
app.route("/api/audit", auditRouter);
app.route("/api/backups", backupsRouter);

app.route("/api/settings", settingsRouter);
app.route("/api/users", usersRouter);

// FeedHub 路由（受 JWT 保护）
import feedSettingsRouter from "./routes/feed-settings";
app.route("/api/dynamic-routes", dynamicRoutesRouter);
app.route("/api/website-rss", websiteRssRouter);
app.route("/api/auth-credentials", authCredentialsRouter);
app.route("/api/npm-packages", npmPackagesRouter);
app.route("/api/feed-settings", feedSettingsRouter);

// 获取当前登录用户信息
app.get("/api/me", (c) => {
  const db = getDb();
  const userId = c.req.header("X-User-Id");
  const user = db.prepare("SELECT id, username, email, avatarUrl, createdAt FROM users WHERE id = ?").get(userId);
  return c.json(user);
});

// 更新当前用户信息
app.put("/api/me", async (c) => {
  const db = getDb();
  const userId = c.req.header("X-User-Id");
  const body = await c.req.json();
  const { avatarUrl, email } = body as { avatarUrl?: string; email?: string };

  const updates: string[] = [];
  const params: unknown[] = [];

  if (avatarUrl !== undefined) {
    updates.push("avatarUrl = ?");
    params.push(avatarUrl);
  }

  if (email !== undefined) {
    updates.push("email = ?");
    params.push(email);
  }

  if (updates.length === 0) {
    return c.json({ error: "没有要更新的内容" }, 400);
  }

  updates.push("updatedAt = datetime('now')");
  params.push(userId);

  try {
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    const updatedUser = db.prepare("SELECT id, username, email, avatarUrl, createdAt FROM users WHERE id = ?").get(userId);
    return c.json(updatedUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

const port = Number(process.env.PORT) || 3001;

// 生产模式：服务前端静态文件
if (process.env.NODE_ENV === "production") {
  const frontendDist = process.env.FRONTEND_DIST || path.resolve(process.cwd(), "frontend/dist");
  console.log("[Static] Serving frontend from:", frontendDist);

  // MIME 类型映射
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".webp": "image/webp",
    ".map": "application/json",
  };

  // 静态资源 + SPA fallback（排除 /api 路径）
  app.get("*", (c) => {
    if (c.req.path.startsWith("/api")) {
      return c.json({ error: "Not Found" }, 404);
    }
    // 尝试提供静态文件
    const reqPath = c.req.path === "/" ? "/index.html" : c.req.path;
    const filePath = path.join(frontendDist, reqPath);
    // 安全检查：防止路径遍历
    if (!filePath.startsWith(frontendDist)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const content = fs.readFileSync(filePath);
      return c.body(content, 200, { "Content-Type": contentType });
    }
    // SPA fallback：返回 index.html
    const indexPath = path.join(frontendDist, "index.html");
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, "utf-8"));
    }
    return c.json({ error: "Not Found" }, 404);
  });
}

console.log(`🚀 nowen-note API running on http://localhost:${port}`);
console.log(`📖 OpenAPI 文档: http://localhost:${port}/api/openapi.json`);
serve({ fetch: app.fetch, port });
