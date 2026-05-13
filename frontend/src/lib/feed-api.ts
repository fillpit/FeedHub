import type {
  DynamicRoute, DynamicRouteCreate, DynamicRouteUpdate,
  WebsiteRssConfig, WebsiteRssCreate, WebsiteRssUpdate,
  AuthCredential, AuthCredentialCreate, AuthCredentialUpdate,
  ScriptResult, ScrapeResult, ScriptFile,
} from "@/types/feed";

function getToken(): string | null {
  return localStorage.getItem("nowen-token");
}

function getBaseUrl(): string {
  const server = localStorage.getItem("nowen-server-url");
  return server ? `${server}/api` : "/api";
}

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${getBaseUrl()}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function json(body: unknown): string {
  return JSON.stringify(body);
}

// ─── 动态路由 ────────────────────────────────────────────────────────────────

export const dynamicRouteApi = {
  list: () => req<DynamicRoute[]>("/dynamic-routes"),
  get: (id: number) => req<DynamicRoute>(`/dynamic-routes/${id}`),
  create: (data: DynamicRouteCreate) => req<DynamicRoute>("/dynamic-routes", { method: "POST", body: json(data) }),
  update: (id: number, data: DynamicRouteUpdate) => req<DynamicRoute>(`/dynamic-routes/${id}`, { method: "PUT", body: json(data) }),
  delete: (id: number) => req<{ success: boolean }>(`/dynamic-routes/${id}`, { method: "DELETE" }),

  // 脚本文件
  listFiles: (id: number) => req<ScriptFile[]>(`/dynamic-routes/${id}/files`),
  getFileContent: (id: number, filePath: string) =>
    req<{ content: string }>(`/dynamic-routes/${id}/files/content?path=${encodeURIComponent(filePath)}`),
  saveFileContent: (id: number, filePath: string, content: string) =>
    req<{ success: boolean }>(`/dynamic-routes/${id}/files/content`, { method: "PUT", body: json({ path: filePath, content }) }),
  deleteFile: (id: number, filePath: string) =>
    req<{ success: boolean }>(`/dynamic-routes/${id}/files`, { method: "DELETE", body: json({ path: filePath }) }),
  initScript: (id: number) => req<{ folder: string }>(`/dynamic-routes/${id}/init-script`, { method: "POST" }),
  getReadme: (id: number) => req<{ content: string }>(`/dynamic-routes/${id}/readme`),
  saveReadme: (id: number, content: string) =>
    req<{ success: boolean }>(`/dynamic-routes/${id}/readme`, { method: "PUT", body: json({ content }) }),

  // 调试
  debug: (id: number, params?: Record<string, string>) =>
    req<ScriptResult>(`/dynamic-routes/${id}/debug`, { method: "POST", body: json({ params }) }),
};

// ─── 网页监控 ────────────────────────────────────────────────────────────────

export const websiteRssApi = {
  list: () => req<WebsiteRssConfig[]>("/website-rss"),
  get: (id: number) => req<WebsiteRssConfig>(`/website-rss/${id}`),
  create: (data: WebsiteRssCreate) => req<WebsiteRssConfig>("/website-rss", { method: "POST", body: json(data) }),
  update: (id: number, data: WebsiteRssUpdate) => req<WebsiteRssConfig>(`/website-rss/${id}`, { method: "PUT", body: json(data) }),
  delete: (id: number) => req<{ success: boolean }>(`/website-rss/${id}`, { method: "DELETE" }),

  // 调试
  debug: (id: number) => req<ScrapeResult>(`/website-rss/${id}/debug`, { method: "POST" }),
  debugAdHoc: (data: { url: string; selector: import("@/types/feed").WebsiteRssSelector; authCredentialId?: number }) =>
    req<ScrapeResult>("/website-rss/debug-ad-hoc", { method: "POST", body: json(data) }),
  refresh: (id: number) => req<{ success: boolean; itemCount?: number; error?: string }>(`/website-rss/${id}/refresh`, { method: "POST" }),
};

// ─── 授权凭证 ────────────────────────────────────────────────────────────────

export const authCredentialApi = {
  list: () => req<AuthCredential[]>("/auth-credentials"),
  get: (id: number) => req<AuthCredential>(`/auth-credentials/${id}`),
  create: (data: AuthCredentialCreate) => req<AuthCredential>("/auth-credentials", { method: "POST", body: json(data) }),
  update: (id: number, data: AuthCredentialUpdate) => req<AuthCredential>(`/auth-credentials/${id}`, { method: "PUT", body: json(data) }),
  delete: (id: number) => req<{ success: boolean }>(`/auth-credentials/${id}`, { method: "DELETE" }),
};

// ─── 全局设置 ────────────────────────────────────────────────────────────────

export const feedSettingsApi = {
  get: () => req<Record<string, string>>("/feed-settings"),
  save: (data: Record<string, string>) => req<Record<string, string>>("/feed-settings", { method: "PUT", body: json(data) }),
  clearCache: () => req<{ success: boolean }>("/feed-settings/clear-cache", { method: "POST" }),
  testPush: (type: "bark" | "feishu", payload: Record<string, string>) =>
    req<{ success: boolean; error?: string }>("/feed-settings/test-push", { method: "POST", body: json({ type, payload }) }),
};

// ─── Feed URL 生成 ────────────────────────────────────────────────────────────

export function getDynamicFeedUrl(routePath: string, type: "rss" | "json" = "rss"): string {
  const base = getBaseUrl();
  return `${base}/dynamic/sub${routePath}?type=${type}`;
}

export function getWebsiteFeedUrl(key: string, type: "rss" | "json" = "rss"): string {
  const base = getBaseUrl();
  return `${base}/website/sub/${key}?type=${type}`;
}
