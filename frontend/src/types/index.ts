// 重新导出共享的类型定义
export type {
  // API相关
  ApiResponse,
  PaginatedResponse,
  ApiValidationError,
  DetailedErrorResponse,
  RequestConfig,
  FileUploadResponse,
  BatchOperationResponse,

  // 资源相关
  WebsiteRssConfig,

  // 用户相关
  UserInfo,
  UserRole,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  UserSettingAttributes,
  GlobalSettingAttributes,
  NotificationSettings,
  SaveSettingsRequest,

  // 认证相关
  AuthCredential,
} from "@feedhub/shared";

// 重新导出常量
export {
  HTTP_STATUS,
  ERROR_CODES,
  USER_ROLES,
  CLOUD_TYPES,
  NOTIFICATION_TYPES,
  NOTIFICATION_TRIGGERS,
  RSS_UPDATE_FREQUENCIES,
  FILE_SIZE_LIMITS,
  SUPPORTED_FILE_TYPES,
  PAGINATION,
  CACHE_KEYS,
  CACHE_TTL,
  REGEX_PATTERNS,
  ENV,
  LOG_LEVELS,
  TIMEOUTS,
  DEFAULT_TAG_COLORS,
  SYSTEM_CONFIG,
} from "@feedhub/shared";

// 重新导出工具函数
export {
  Validator,
  DateUtils,
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  NetworkError,
  DatabaseError,
  ExternalApiError,
  ErrorHandler,
  HttpStatusUtils,
  RequestCache,
  RateLimiter,
} from "@feedhub/shared";

// 本地特有的类型定义（如果有特殊需求）
// 注意：ShareInfo 和 Folder 在共享代码库中已有定义，这里保留是为了兼容性
// 建议逐步迁移到共享代码库的定义
