// 共享的错误处理工具函数
import { ERROR_CODES, HTTP_STATUS } from "../constants";
import type { ValidationError as ApiValidationError, DetailedErrorResponse } from "../types/api";

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public readonly code: number;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    code: number = ERROR_CODES.UNKNOWN_ERROR,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // 确保堆栈跟踪正确
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  public readonly validationErrors: ApiValidationError[];

  constructor(message: string, validationErrors: ApiValidationError[] = []) {
    super(message, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
    this.name = "ValidationError";
    this.validationErrors = validationErrors;
  }
}

/**
 * 认证错误类
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "认证失败") {
    super(message, ERROR_CODES.AUTHENTICATION_ERROR, HTTP_STATUS.UNAUTHORIZED);
    this.name = "AuthenticationError";
  }
}

/**
 * 授权错误类
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "权限不足") {
    super(message, ERROR_CODES.AUTHORIZATION_ERROR, HTTP_STATUS.FORBIDDEN);
    this.name = "AuthorizationError";
  }
}

/**
 * 资源未找到错误类
 */
export class NotFoundError extends AppError {
  constructor(message: string = "资源未找到") {
    super(message, ERROR_CODES.RESOURCE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    this.name = "NotFoundError";
  }
}

/**
 * 资源冲突错误类
 */
export class ConflictError extends AppError {
  constructor(message: string = "资源冲突") {
    super(message, ERROR_CODES.RESOURCE_CONFLICT, HTTP_STATUS.CONFLICT);
    this.name = "ConflictError";
  }
}

/**
 * 限流错误类
 */
export class RateLimitError extends AppError {
  constructor(message: string = "请求过于频繁") {
    super(message, ERROR_CODES.RATE_LIMIT_EXCEEDED, HTTP_STATUS.BAD_REQUEST);
    this.name = "RateLimitError";
  }
}

/**
 * 网络错误类
 */
export class NetworkError extends AppError {
  constructor(message: string = "网络错误") {
    super(message, ERROR_CODES.NETWORK_ERROR, HTTP_STATUS.BAD_GATEWAY);
    this.name = "NetworkError";
  }
}

/**
 * 数据库错误类
 */
export class DatabaseError extends AppError {
  constructor(message: string = "数据库错误") {
    super(message, ERROR_CODES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    this.name = "DatabaseError";
  }
}

/**
 * 外部API错误类
 */
export class ExternalApiError extends AppError {
  constructor(message: string = "外部API错误") {
    super(message, ERROR_CODES.EXTERNAL_API_ERROR, HTTP_STATUS.BAD_GATEWAY);
    this.name = "ExternalApiError";
  }
}

/**
 * 错误处理工具类
 */
export class ErrorHandler {
  /**
   * 判断是否为操作性错误
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * 格式化错误响应
   */
  static formatErrorResponse(error: Error): DetailedErrorResponse {
    if (error instanceof AppError) {
      return {
        success: false,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      };
    }

    // 未知错误
    return {
      success: false,
      message: "服务器内部错误",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 格式化验证错误响应
   */
  static formatValidationErrorResponse(
    validationErrors: ApiValidationError[]
  ): DetailedErrorResponse {
    return {
      success: false,
      message: "数据验证失败",
      details: {
        validationErrors,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 从HTTP状态码创建错误
   */
  static fromHttpStatus(statusCode: number, message?: string): AppError {
    switch (statusCode) {
      case HTTP_STATUS.BAD_REQUEST:
        return new AppError(message || "请求参数错误", ERROR_CODES.VALIDATION_ERROR, statusCode);
      case HTTP_STATUS.UNAUTHORIZED:
        return new AuthenticationError(message);
      case HTTP_STATUS.FORBIDDEN:
        return new AuthorizationError(message);
      case HTTP_STATUS.NOT_FOUND:
        return new NotFoundError(message);
      case HTTP_STATUS.CONFLICT:
        return new ConflictError(message);
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return new ValidationError(message || "数据验证失败");
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return new AppError(message || "服务器内部错误", ERROR_CODES.UNKNOWN_ERROR, statusCode);
      case HTTP_STATUS.BAD_GATEWAY:
        return new NetworkError(message);
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return new AppError(message || "服务不可用", ERROR_CODES.SERVICE_UNAVAILABLE, statusCode);
      default:
        return new AppError(message || "未知错误", ERROR_CODES.UNKNOWN_ERROR, statusCode);
    }
  }

  /**
   * 安全地获取错误消息
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "未知错误";
  }

  /**
   * 安全地获取错误堆栈
   */
  static getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    return undefined;
  }

  /**
   * 记录错误日志
   */
  static logError(error: Error, context?: any): void {
    const errorInfo: any = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof AppError) {
      errorInfo.code = error.code;
      errorInfo.statusCode = error.statusCode;
      errorInfo.isOperational = error.isOperational;
      errorInfo.details = error.details;
    }

    // 这里可以集成具体的日志系统
    console.error("Error logged:", errorInfo);
  }

  /**
   * 包装异步函数，自动处理错误
   */
  static wrapAsync<T extends any[], R>(fn: (...args: T) => Promise<R>): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        // 将未知错误包装为AppError
        throw new AppError(
          ErrorHandler.getErrorMessage(error),
          ERROR_CODES.UNKNOWN_ERROR,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          false
        );
      }
    };
  }
}

/**
 * 重试装饰器
 */
export function retry(maxRetries: number = 3, delay: number = 1000) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // 如果是最后一次尝试，直接抛出错误
          if (attempt === maxRetries) {
            throw lastError;
          }

          // 如果是操作性错误且不应重试，直接抛出
          if (error instanceof AppError && error.isOperational) {
            const nonRetryableCodes = [
              ERROR_CODES.AUTHENTICATION_ERROR,
              ERROR_CODES.AUTHORIZATION_ERROR,
              ERROR_CODES.VALIDATION_ERROR,
              ERROR_CODES.RESOURCE_NOT_FOUND,
            ] as const;
            if (nonRetryableCodes.includes(error.code as any)) {
              throw error;
            }
          }

          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}

/**
 * 超时装饰器
 */
export function timeout(ms: number) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return Promise.race([
        originalMethod.apply(this, args),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new AppError(
                `操作超时 (${ms}ms)`,
                ERROR_CODES.UNKNOWN_ERROR,
                HTTP_STATUS.INTERNAL_SERVER_ERROR
              )
            );
          }, ms);
        }),
      ]);
    };

    return descriptor;
  };
}
