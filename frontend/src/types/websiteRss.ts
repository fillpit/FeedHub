export interface WebsiteRssSelector {
  selectorType: "css" | "xpath"; // 选择器类型：CSS 或 XPath
  container: string;  // 文章容器选择器（必填）
  title: string;       // 标题选择器
  date?: string;       // 日期选择器（可选）
  content: string;     // 内容选择器
  link?: string;       // 链接选择器（可选）
  dateFormat?: string; // 日期格式（可选）
  author?: string;     // 作者选择器（可选）
  image?: string;      // 文章封面图片选择器（可选）
}

// 授权配置接口
export interface WebsiteRssAuth {
  enabled: boolean; // 是否启用授权
  authType: "none" | "cookie" | "basic" | "bearer" | "custom"; // 授权类型
  cookie?: string; // Cookie 字符串
  basicAuth?: {
    username: string;
    password: string;
  };
  bearerToken?: string; // Bearer Token
  customHeaders?: Record<string, string>; // 自定义请求头
}

// 抓取模式
export type FetchMode = "selector" | "script";

// 脚本抓取配置
export interface WebsiteRssScript {
  enabled: boolean; // 是否启用脚本抓取
  script: string; // JavaScript脚本内容
  timeout?: number; // 脚本执行超时时间（毫秒）
}

export interface WebsiteRssConfig {
  id: number;
  key: string;
  userId?: number;
  title: string;
  url: string;
  favicon?: string;
  fetchMode: FetchMode;
  description?: string;
  feedUrl?: string;
  lastFetchedAt?: string;
  fetchInterval: number;
  maxFeeds: number;
  useProxy: boolean;
  selector: WebsiteRssSelector;
  auth: WebsiteRssAuth;
  authCredentialId?: number;
  templateId?: number;
  templateParameters?: Record<string, any>;
  script: WebsiteRssScript;
  createdAt: string;
  updatedAt: string;
}

export type WebsiteRssConfigList = WebsiteRssConfig[];

export interface WebsiteRssFeed {
  id: number;
  configId: number;
  title: string;
  link: string;
  guid: string;
  content: string;
  contentSnippet: string;
  author: string;
  pubDate: string;
  image?: string;      // 文章封面图片URL
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteRssArticle {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  guid: string;
}

export interface WebsiteRssStore {
  configs: WebsiteRssConfig[];
  currentConfig: WebsiteRssConfig | null;
  loading: boolean;
  error: string | null;
}