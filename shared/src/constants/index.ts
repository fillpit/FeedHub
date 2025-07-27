// 共享的常量定义

// HTTP状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// 业务错误码
export const ERROR_CODES = {
  SUCCESS: 0,
  UNKNOWN_ERROR: 10000,
  VALIDATION_ERROR: 10001,
  AUTHENTICATION_ERROR: 10002,
  AUTHORIZATION_ERROR: 10003,
  RESOURCE_NOT_FOUND: 10004,
  RESOURCE_CONFLICT: 10005,
  RATE_LIMIT_EXCEEDED: 10006,
  SERVICE_UNAVAILABLE: 10007,
  DATABASE_ERROR: 10008,
  NETWORK_ERROR: 10009,
  FILE_UPLOAD_ERROR: 10010,
  EXTERNAL_API_ERROR: 10011,
} as const;

// 用户角色
export const USER_ROLES = {
  NORMAL_USER: 0,
  ADMIN: 1,
} as const;

// 云存储类型
export const CLOUD_TYPES = {
  PAN_115: "pan115",
  QUARK: "quark",
  BAIDU_PAN: "baiduPan",
  ALIYUN: "aliyun",
  WEIYUN: "weiyun",
} as const;

// 通知类型
export const NOTIFICATION_TYPES = {
  BARK: "bark",
  EMAIL: "email",
  GOTIFY: "gotify",
  WECHAT_WORK: "wechatWork",
  DINGTALK: "dingtalk",
  FEISHU: "feishu",
} as const;

// 通知触发条件
export const NOTIFICATION_TRIGGERS = {
  NEW_FEED_ITEMS: "newFeedItems",
  FEED_UPDATE_ERRORS: "feedUpdateErrors",
  SYSTEM_ALERTS: "systemAlerts",
} as const;

// RSS更新频率（分钟）
export const RSS_UPDATE_FREQUENCIES = {
  EVERY_5_MINUTES: 5,
  EVERY_15_MINUTES: 15,
  EVERY_30_MINUTES: 30,
  EVERY_HOUR: 60,
  EVERY_2_HOURS: 120,
  EVERY_6_HOURS: 360,
  EVERY_12_HOURS: 720,
  DAILY: 1440,
} as const;

// 文件大小限制（字节）
export const FILE_SIZE_LIMITS = {
  AVATAR: 2 * 1024 * 1024, // 2MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  BACKUP: 50 * 1024 * 1024, // 50MB
} as const;

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = {
  IMAGE: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  DOCUMENT: ["pdf", "doc", "docx", "txt", "md"],
  ARCHIVE: ["zip", "rar", "7z", "tar", "gz"],
  VIDEO: ["mp4", "avi", "mkv", "mov", "wmv"],
  AUDIO: ["mp3", "wav", "flac", "aac"],
} as const;

// 分页默认值
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// 缓存键前缀
export const CACHE_KEYS = {
  USER: "user:",
  RSS_FEED: "rss_feed:",
  RSS_ITEM: "rss_item:",
  NOTIFICATION: "notification:",
  SETTING: "setting:",
  DYNAMIC_ROUTE: "dynamic_route:",
} as const;

// 缓存过期时间（秒）
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5分钟
  MEDIUM: 30 * 60, // 30分钟
  LONG: 2 * 60 * 60, // 2小时
  VERY_LONG: 24 * 60 * 60, // 24小时
} as const;

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  URL: /^https?:\/\/.+/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^[^\s\u4e00-\u9fa5]{6,}$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  CHINESE_NAME: /^[\u4e00-\u9fa5]{2,10}$/,
  ID_CARD: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
} as const;

// 环境变量
export const ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

// 日志级别
export const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// 请求超时时间（毫秒）
export const TIMEOUTS = {
  SHORT: 5000, // 5秒
  MEDIUM: 15000, // 15秒
  LONG: 30000, // 30秒
  VERY_LONG: 60000, // 60秒
} as const;

// 重试配置
export const RETRY_CONFIG = {
  DEFAULT_RETRIES: 3,
  DEFAULT_DELAY: 1000, // 1秒
  MAX_DELAY: 10000, // 10秒
} as const;

// 默认标签颜色
export const DEFAULT_TAG_COLORS = {
  baiduPan: "#2196F3",
  weiyun: "#4CAF50",
  aliyun: "#FF9800",
  pan115: "#9C27B0",
  quark: "#F44336",
} as const;

// 系统配置
export const SYSTEM_CONFIG = {
  JWT_EXPIRES_IN: "6h",
  BCRYPT_ROUNDS: 10,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15分钟
  PASSWORD_RESET_EXPIRES: 30 * 60 * 1000, // 30分钟
  SESSION_TIMEOUT: 6 * 60 * 60 * 1000, // 6小时
} as const;
