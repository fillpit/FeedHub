// 图书章节订阅系统类型定义

// OPDS服务配置
export interface OpdsConfig {
  id?: number;
  name: string; // 服务名称
  url: string; // OPDS服务地址
  username?: string; // 用户名（如果需要认证）
  password?: string; // 密码（如果需要认证）
  authType: 'none' | 'basic' | 'bearer'; // 认证类型
  bearerToken?: string; // Bearer token
  enabled: boolean; // 是否启用
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 书籍来源类型
export type BookSourceType = 'upload' | 'opds' | 'url';

// 书籍信息
export interface Book {
  id: number;
  title: string; // 书籍标题
  author: string; // 作者
  description?: string; // 描述
  coverUrl?: string; // 封面图片URL
  sourceType: BookSourceType; // 来源类型
  sourcePath?: string; // 文件路径（上传文件）
  sourceUrl?: string; // 来源URL（OPDS或在线链接）
  opdsConfigId?: number; // OPDS配置ID
  language?: string; // 语言
  isbn?: string; // ISBN
  categories?: string[]; // 分类
  fileFormat?: string; // 文件格式（epub, txt, pdf等）
  fileSize?: number; // 文件大小（字节）
  totalChapters: number; // 总章节数
  lastChapterTitle?: string; // 最新章节标题
  lastChapterTime?: Date | string; // 最新章节时间
  updateFrequency: number; // 更新检查频率（分钟）
  isActive: boolean; // 是否激活订阅
  createdAt: Date | string;
  updatedAt: Date | string;
}

// OPDS书籍类型定义
export interface OpdsBook {
    id: string;
    title: string;
    author: string;
    description?: string;
    link?: string;
}

// 章节信息
export interface Chapter {
  id: number;
  bookId: number;
  chapterNumber: number; // 章节序号
  title: string; // 章节标题
  content?: string; // 章节内容
  wordCount?: number; // 字数
  publishTime?: Date | string; // 发布时间
  isNew: boolean; // 是否为新章节
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 章节订阅配置类型
export interface BookChapterRssConfig {
  id: number;
  key: string;
  title: string;
  description: string;
  bookId: number | null;
  bookInfo?: Book;
  includeContent: boolean;

  updateInterval: number; // 更新间隔（天）
  minReturnChapters?: number; // 最小返回章节数，默认3
  chaptersPerUpdate?: number; // 每次更新返回的章节数，默认3

  currentReadChapter?: number; // 当前阅读进度（章节号），默认0
  lastUpdateTime?: string;
  createdAt: string;
  updatedAt: string;
}

// 订阅配置
export interface Subscription {
  id: number;
  bookId: number;
  userId?: number; // 用户ID（如果有用户系统）
  subscriptionKey: string; // 订阅唯一标识
  title: string; // 订阅标题
  description?: string; // 订阅描述
  format: 'rss' | 'json'; // 订阅格式
  includeContent: boolean; // 是否包含章节内容
  maxItems: number; // 最大条目数
  isActive: boolean; // 是否激活
  lastAccessTime?: Date | string; // 最后访问时间
  accessCount: number; // 访问次数
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 更新任务
export interface UpdateTask {
  id: number;
  bookId: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRunTime?: Date | string;
  nextRunTime: Date | string;
  errorMessage?: string;
  newChaptersFound: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// RSS/JSON订阅项目
export interface SubscriptionItem {
  id: string; // 唯一标识
  title: string; // 章节标题
  author: string; // 作者
  description: string; // 章节描述或摘要
  link: string; // 章节链接
  guid: string; // RSS GUID
  pubDate: string; // 发布时间
  content?: string; // 章节内容（如果包含）
  chapterNumber: number; // 章节序号
  wordCount?: number; // 字数
}

// 订阅输出格式
export interface SubscriptionFeed {
  title: string; // 订阅标题
  description: string; // 订阅描述
  link: string; // 订阅链接
  lastBuildDate: string; // 最后构建时间
  items: SubscriptionItem[]; // 订阅项目
  totalItems: number; // 总项目数
  bookInfo: {
    title: string;
    author: string;
    totalChapters: number;
    lastChapterTitle?: string;
    lastChapterTime?: string;
  };
}

// Store状态接口
export interface BookSubscriptionStore {
  books: Book[];
  subscriptions: Subscription[];
  opdsConfigs: OpdsConfig[];
  currentBook: Book | null;
  loading: boolean;
  error: string | null;
}

// 文件上传结果
export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

// 章节解析结果
export interface ChapterParseResult {
  chapters: Omit<Chapter, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>[];
  totalChapters: number;
  lastChapterTitle?: string;
}

// OPDS解析结果
export interface OpdsParseResult {
  books: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>[];
  totalCount?: number;
  nextPageUrl?: string;
}

// 图书过滤配置
export interface BookFilter {
  title?: string;
  author?: string;
  categories?: string[];
  language?: string;
  fileFormats?: string[];
}

// 图书RSS配置接口
export interface BookRssConfig {
  id: number;
  key?: string;
  title: string;
  description: string;
  opdsConfig: OpdsConfig;
  bookFilter: BookFilter;
  maxBooks: number;
  updateInterval: number;
  favicon?: string;
  lastUpdateTime?: string;
  lastBooks?: any[];
  // 新增章节订阅相关字段
  bookId?: number;
  includeContent?: boolean;

  minReturnChapters?: number; // 最小返回章节数，默认3
  chaptersPerUpdate?: number; // 每次更新返回的章节数，默认3

  currentReadChapter?: number; // 当前阅读进度（章节号），默认0
  parseStatus?: 'pending' | 'parsing' | 'completed' | 'failed';
  parseError?: string;
  lastParseTime?: Date | string;
  lastFeedTime?: Date | string;
  bookInfo?: {
    id: number;
    title: string;
    author: string;
    totalChapters: number;
    sourceType: BookSourceType;
    opdsConfigId?: number;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// BookRss Store 状态类型
export interface BookRssStore {
  configs: BookRssConfig[];
  currentConfig: BookRssConfig | null;
  loading: boolean;
  error: string | null;
}