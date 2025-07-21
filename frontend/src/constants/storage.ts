// 存储键名常量
export const STORAGE_KEYS = {
  // 认证相关
  USERNAME: "saved_username",
  PASSWORD: "saved_password",
  TOKEN: "token",
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  
  // 应用设置
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  
  // 业务数据缓存
  RSS_CONFIGS: 'rss_configs_cache',
  WEBSITE_RSS: 'website_rss_cache',
  RSS_TEMPLATES: 'rss_templates_cache',
  
  // 用户偏好
  RECENT_SEARCHES: 'recent_searches',
  FAVORITE_FEEDS: 'favorite_feeds',
  READ_ARTICLES: 'read_articles',
  
  // 表单数据
  FORM_DRAFTS: 'form_drafts',
  
  // 临时数据
  TEMP_DATA: 'temp_data',
  LAST_VISIT: 'last_visit',
  
  // 性能相关
  API_CACHE: 'api_cache',
  STATIC_CACHE: 'static_cache'
} as const;

// 存储配置常量
export const STORAGE_CONFIG = {
  // 过期时间（毫秒）
  EXPIRES: {
    TOKEN: 7 * 24 * 60 * 60 * 1000,        // 7天
    USER_INFO: 7 * 24 * 60 * 60 * 1000,    // 7天
    CACHE_SHORT: 30 * 60 * 1000,           // 30分钟
    CACHE_MEDIUM: 2 * 60 * 60 * 1000,      // 2小时
    CACHE_LONG: 24 * 60 * 60 * 1000,       // 24小时
    FORM_DRAFT: 24 * 60 * 60 * 1000,       // 24小时
    TEMP_DATA: 60 * 60 * 1000              // 1小时
  },
  
  // 存储大小限制（字节）
  SIZE_LIMITS: {
    MAX_ITEM_SIZE: 1024 * 1024,            // 1MB
    MAX_TOTAL_SIZE: 5 * 1024 * 1024,       // 5MB
    WARNING_SIZE: 4 * 1024 * 1024          // 4MB 警告阈值
  },
  
  // 压缩配置
  COMPRESSION: {
    MIN_SIZE: 1024,                        // 超过1KB才压缩
    LEVEL: 6                               // 压缩级别
  }
} as const;

// 存储类型定义
export type StorageKey = keyof typeof STORAGE_KEYS;
export type StorageKeyValue = typeof STORAGE_KEYS[StorageKey];
