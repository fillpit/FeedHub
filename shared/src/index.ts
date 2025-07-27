// 共享代码库主入口文件

// 导出类型定义
export * from './types/api';
export * from './types/auth';
export * from './types/user';
export * from './types/websiteRss';

// 导出常量
export * from './constants';

// 导出工具函数
export * from './utils/validation';
export * from './utils/date';
export * from './utils/http';

// 导出错误处理相关（避免ValidationError冲突）
export {
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
  retry,
  timeout
} from './utils/error';

// 重新导出ValidationError以避免冲突
export { ValidationError as ApiValidationError } from './types/api';
export { ValidationError as AppValidationError } from './utils/error';

// 导出默认配置
export { default as DateUtils } from './utils/date';
export { Validator } from './utils/validation';
export { HttpStatusUtils, RequestCache, RateLimiter } from './utils/http';