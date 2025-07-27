import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  AppValidationError,
  ConflictError,
  ErrorHandler,
  HTTP_STATUS,
  ERROR_CODES,
  DetailedErrorResponse,
} from "@feedhub/shared";

// 为了兼容现有代码，创建别名和自定义类
export { AppError, NotFoundError };
export const AuthError = AuthenticationError;
export const ForbiddenError = AuthorizationError;
export const ValidationError = AppValidationError;

// 业务错误类（本地定义）
export class BusinessError extends AppError {
  constructor(message: string, code?: string) {
    super(message, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, true, { code });
  }
}

// 数据库错误处理
const handleDatabaseError = (error: any): AppError => {
  if (error.name === "SequelizeValidationError") {
    const errors = error.errors.map((err: any) => ({
      field: err.path,
      message: err.message,
    }));
    return new AppValidationError("数据验证失败", errors);
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    const field = error.errors[0]?.path || "unknown";
    return new BusinessError(`${field} 已存在`, "DUPLICATE_ENTRY");
  }

  if (error.name === "SequelizeForeignKeyConstraintError") {
    return new BusinessError("关联数据不存在", "FOREIGN_KEY_CONSTRAINT");
  }

  if (error.name === "SequelizeConnectionError") {
    return new AppError(
      "数据库连接失败",
      ERROR_CODES.DATABASE_ERROR,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      false
    );
  }

  return new AppError(
    "数据库操作失败",
    ERROR_CODES.DATABASE_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    false
  );
};

// JWT错误处理
const handleJWTError = (error: any): AppError => {
  if (error.name === "JsonWebTokenError") {
    return new AuthError("无效的访问令牌");
  }

  if (error.name === "TokenExpiredError") {
    return new AuthError("访问令牌已过期");
  }

  if (error.name === "NotBeforeError") {
    return new AuthError("访问令牌尚未生效");
  }

  return new AuthError("令牌验证失败");
};

// 错误响应格式化
const formatErrorResponse = (error: AppError, req: Request) => {
  const response: any = {
    success: false,
    message: error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // 开发环境下添加更多调试信息
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
    if (error.code) {
      response.code = error.code;
    }
  }

  // 验证错误添加详细信息
  if (error instanceof AppValidationError && error.validationErrors?.length > 0) {
    response.errors = error.validationErrors;
  }

  return response;
};

// 错误日志记录
const logError = (error: AppError, req: Request) => {
  const logData = {
    message: error.message,
    statusCode: error.statusCode,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    userId: (req as any).user?.id,
    stack: error.stack,
  };

  if (error.statusCode >= 500) {
    logger.error("服务器错误", logData);
  } else if (error.statusCode >= 400) {
    logger.warn("客户端错误", logData);
  } else {
    logger.info("请求错误", logData);
  }
};

// 主错误处理中间件
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  let appError: AppError;

  // 如果已经是AppError实例，直接使用
  if (error instanceof AppError) {
    appError = error;
  } else {
    // 根据错误类型进行转换
    if (error.name?.startsWith("Sequelize")) {
      appError = handleDatabaseError(error);
    } else if (error.name?.includes("JsonWebToken") || error.name?.includes("Token")) {
      appError = handleJWTError(error);
    } else if (error.type === "entity.parse.failed") {
      appError = new AppValidationError("请求体格式错误");
    } else if (error.code === "LIMIT_FILE_SIZE") {
      appError = new AppValidationError("文件大小超出限制");
    } else {
      // 未知错误
      appError = new AppError(
        process.env.NODE_ENV === "production" ? "服务器内部错误" : error.message,
        ERROR_CODES.UNKNOWN_ERROR,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        false
      );
    }
  }

  // 记录错误日志
  logError(appError, req);

  // 如果响应已经发送，交给Express默认错误处理
  if (res.headersSent) {
    return next(error);
  }

  // 发送错误响应
  res.status(appError.statusCode).json(formatErrorResponse(appError, req));
};

// 异步错误捕获包装器
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 全局未捕获异常处理
export const setupGlobalErrorHandlers = () => {
  // 未捕获的Promise拒绝
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.error("未处理的Promise拒绝", {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
    });

    // 优雅关闭应用
    process.exit(1);
  });

  // 未捕获的异常
  process.on("uncaughtException", (error: Error) => {
    logger.error("未捕获的异常", {
      message: error.message,
      stack: error.stack,
    });

    // 优雅关闭应用
    process.exit(1);
  });

  // 进程退出信号处理
  process.on("SIGTERM", () => {
    logger.info("收到SIGTERM信号，准备关闭应用");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("收到SIGINT信号，准备关闭应用");
    process.exit(0);
  });
};

// 兼容旧接口
interface CustomError extends Error {
  status?: number;
}
