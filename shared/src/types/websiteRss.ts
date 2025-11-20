// 字段抓取配置
export interface SelectorField {
  selector: string; // 选择器表达式
  extractType: "text" | "attr" | "html"; // 抓取类型：文本值、属性值或HTML内容
  attrName?: string; // 当extractType为attr时，指定属性名
  regexPattern?: string; // 正则表达式模式（可选）
  regexFlags?: string; // 正则表达式标志（可选，如 'g', 'i', 'gi' 等）
  regexGroup?: number; // 正则表达式捕获组索引（可选，默认为0表示整个匹配）
}

export interface WebsiteRssSelector {
  selectorType: "css" | "xpath"; // 选择器类型：CSS 或 XPath
  container: string; // 文章容器选择器（必填）
  title: SelectorField; // 标题选择器配置
  date?: SelectorField; // 日期选择器配置（可选）
  content: SelectorField; // 内容选择器配置
  link?: SelectorField; // 链接选择器配置（可选）
  dateFormat?: string; // 日期格式（可选）
  author?: SelectorField; // 作者选择器配置（可选）
  image?: SelectorField; // 文章封面图片选择器配置（可选）
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

// 脚本抓取配置
export interface WebsiteRssScript {
  enabled: boolean; // 是否启用脚本抓取
  script: string; // JavaScript脚本内容
  timeout?: number; // 脚本执行超时时间（毫秒）
}

// 网站RSS配置基础接口
export interface WebsiteRssConfigBase {
  id: number;
  key: string;
  title: string;
  url: string;
  selector: WebsiteRssSelector; // 包含各种选择器
  auth: WebsiteRssAuth; // 授权配置
  authCredentialId?: number; // 授权信息ID
  renderMode?: "static" | "rendered"; // 页面渲染模式：static-直接请求HTML，rendered-使用浏览器渲染
  lastContent?: string; // 上次抓取的内容
  lastFetchTime?: Date | string; // 上次抓取时间
  lastFetchStatus?: "success" | "failure"; // 上次抓取状态：成功或失败
  lastFetchError?: string; // 上次抓取失败的错误摘要
  fetchInterval: number; // 抓取间隔（分钟）
  rssDescription?: string; // RSS描述
  favicon?: string; // 网站图标
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 后端数据库模型属性（包含必填字段）
export interface WebsiteRssConfigAttributes extends WebsiteRssConfigBase {
  lastContent: string; // 后端必填
  lastFetchTime: Date; // 后端必填
}

// 前端使用的配置接口（字段可选且类型适配前端）
export interface WebsiteRssConfig
  extends Omit<WebsiteRssConfigBase, "lastFetchTime" | "createdAt" | "updatedAt"> {
  description?: string; // 前端别名
  feedUrl?: string; // 前端额外字段
  lastFetchedAt?: string; // 前端使用字符串格式
  maxFeeds?: number; // 前端额外字段
  useProxy?: boolean; // 前端额外字段
  createdAt: string; // 前端使用字符串格式
  updatedAt: string; // 前端使用字符串格式
}

export type WebsiteRssConfigList = WebsiteRssConfig[];

// RSS文章接口
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
  image?: string; // 文章封面图片URL
  createdAt: string;
  updatedAt: string;
}

// RSS文章简化接口
export interface WebsiteRssArticle {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  guid: string;
}

// 前端Store接口
export interface WebsiteRssStore {
  configs: WebsiteRssConfig[];
  currentConfig: WebsiteRssConfig | null;
  loading: boolean;
  error: string | null;
}

// 创建配置时的可选属性
export interface WebsiteRssConfigCreationAttributes
  extends Omit<WebsiteRssConfigAttributes, "id" | "lastContent" | "lastFetchTime"> {
  lastContent?: string;
  lastFetchTime?: Date;
}
