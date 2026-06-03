// ─── 动态路由 ────────────────────────────────────────────────────────────────

export interface RouteParam {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface RouteScript {
  sourceType: "inline";
  source?: "local" | "github";
  folder: string;
  timeout: number;
  githubConfig?: {
    owner: string;
    repo: string;
    branch?: string;
    path?: string;
    token?: string;
  };
}

export interface DynamicRoute {
  id: number;
  name: string;
  path: string;
  method: "GET" | "POST";
  params: RouteParam[];
  script: RouteScript;
  description?: string;
  refreshInterval: number;
  authCredentialId?: number;
  lastRunAt?: string;
  lastRunStatus?: "success" | "failure";
  lastRunError?: string;
  createdAt: string;
  updatedAt: string;
}

export type DynamicRouteCreate = Omit<DynamicRoute, "id" | "createdAt" | "updatedAt" | "lastRunAt" | "lastRunStatus" | "lastRunError">;
export type DynamicRouteUpdate = Partial<DynamicRouteCreate>;

// ─── 网页监控 ────────────────────────────────────────────────────────────────

export type SelectorExtractType = "text" | "attr" | "html";
export type SelectorType = "css" | "xpath";

export interface SelectorField {
  selector: string;
  extractType: SelectorExtractType;
  attrName?: string;
  regexPattern?: string;
  regexFlags?: string;
  regexGroup?: number;
}

export interface WebsiteRssSelector {
  selectorType: SelectorType;
  container: string;
  title: SelectorField;
  link?: SelectorField;
  content: SelectorField;
  author?: SelectorField;
  date?: SelectorField;
}

export interface WebsiteRssConfig {
  id: number;
  key: string;
  title: string;
  url: string;
  selector: WebsiteRssSelector;
  renderMode: "static" | "rendered";
  authCredentialId?: number;
  lastContent?: string;
  lastFetchTime?: string;
  lastFetchStatus?: "success" | "failure";
  lastFetchError?: string;
  fetchInterval: number;
  rssDescription?: string;
  favicon?: string;
  createdAt: string;
  updatedAt: string;
}

export type WebsiteRssCreate = Omit<WebsiteRssConfig, "id" | "createdAt" | "updatedAt" | "lastContent" | "lastFetchTime" | "lastFetchStatus" | "lastFetchError">;
export type WebsiteRssUpdate = Partial<WebsiteRssCreate>;

// ─── 授权凭证 ────────────────────────────────────────────────────────────────

export type AuthType = "cookie" | "token" | "basic";

export interface AuthCredential {
  id: number;
  name: string;
  authType: AuthType;
  credential: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type AuthCredentialCreate = Omit<AuthCredential, "id" | "createdAt" | "updatedAt">;
export type AuthCredentialUpdate = Partial<AuthCredentialCreate>;

// ─── Feed 条目（脚本执行结果） ───────────────────────────────────────────────

export interface FeedItem {
  title: string;
  link: string;
  content?: string;
  author?: string;
  pubDate?: string;
  guid?: string;
}

export interface FeedOutput {
  title: string;
  description?: string;
  link?: string;
  items: FeedItem[];
}

// ─── 脚本执行上下文 ──────────────────────────────────────────────────────────

export interface ScriptContext {
  params: Record<string, string | number | boolean>;
  routeParams: Record<string, string>;
  authInfo?: AuthCredential["credential"];
  authHeaders?: Record<string, string>;
}

export interface ScriptResult {
  success: boolean;
  data?: FeedOutput;
  error?: string;
  logs?: Array<{ level: string; message: string }>;
  executionTime: number;
}

// ─── 抓取调试诊断信息 ────────────────────────────────────────────────────────

export interface ScrapeFieldDebug {
  name: string;
  selector: string;
  extractType: string;
  matched: boolean;
  rawValue: string;
  finalValue: string;
  error?: string;
}

export interface ScrapeItemDebug {
  index: number;
  containerHtmlSnippet: string;
  fields: ScrapeFieldDebug[];
  passed: boolean;
  reason?: string;
}

export interface ScrapeDebugInfo {
  htmlLength: number;
  containerCount: number;
  selectorType: "css" | "xpath";
  items: ScrapeItemDebug[];
  logs: string[];
  htmlSource?: string;
}

export interface ScrapeResult {
  items: FeedItem[];
  error?: string;
  executionTime: number;
  debug?: ScrapeDebugInfo;
}

