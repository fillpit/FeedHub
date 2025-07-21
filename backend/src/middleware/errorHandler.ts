import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 业务错误类
export class BusinessError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, true);
    this.code = code;
  }
}

// 认证错误类
export class AuthError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 401, true);
  }
}

// 权限错误类
export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, true);
  }
}

// 资源未找到错误类
export class NotFoundError extends AppError {
  constructor(message: string = '资源未找到') {
    super(message, 404, true);
  }
}

// 验证错误类
export class ValidationError extends AppError {
  public errors: any[];

  constructor(message: string, errors: any[] = []) {
    super(message, 400, true);
    this.errors = errors;
  }
}

// 数据库错误处理
const handleDatabaseError = (error: any): AppError => {
  if (error.name === 'SequelizeValidationError') {
    const errors = error.errors.map((err: any) => ({
      field: err.path,
      message: err.message
    }));
    return new ValidationError('数据验证失败', errors);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path || 'unknown';
    return new BusinessError(`${field} 已存在`, 'DUPLICATE_ENTRY');
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new BusinessError('关联数据不存在', 'FOREIGN_KEY_CONSTRAINT');
  }

  if (error.name === 'SequelizeConnectionError') {
    return new AppError('数据库连接失败', 503, false);
  }

  return new AppError('数据库操作失败', 500, false);
};

// JWT错误处理
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthError('无效的访问令牌');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthError('访问令牌已过期');
  }

  if (error.name === 'NotBeforeError') {
    return new AuthError('访问令牌尚未生效');
  }

  return new AuthError('令牌验证失败');
};

// 错误响应格式化
const formatErrorResponse = (error: AppError, req: Request) => {
  const response: any = {
    success: false,
    message: error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // 开发环境下添加更多调试信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    if (error.code) {
      response.code = error.code;
    }
  }

  // 验证错误添加详细信息
  if (error instanceof ValidationError && error.errors.length > 0) {
    response.errors = error.errors;
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
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    stack: error.stack
  };

  if (error.statusCode >= 500) {
    logger.error('服务器错误', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('客户端错误', logData);
  } else {
    logger.info('请求错误', logData);
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
    if (error.name?.startsWith('Sequelize')) {
      appError = handleDatabaseError(error);
    } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
      appError = handleJWTError(error);
    } else if (error.type === 'entity.parse.failed') {
      appError = new ValidationError('请求体格式错误');
    } else if (error.code === 'LIMIT_FILE_SIZE') {
      appError = new ValidationError('文件大小超出限制');
    } else {
      // 未知错误
      appError = new AppError(
        process.env.NODE_ENV === 'production' ? '服务器内部错误' : error.message,
        500,
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
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 全局未捕获异常处理
export const setupGlobalErrorHandlers = () => {
  // 未捕获的Promise拒绝
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('未处理的Promise拒绝', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
    
    // 优雅关闭应用
    process.exit(1);
  });

  // 未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logger.error('未捕获的异常', {
      message: error.message,
      stack: error.stack
    });
    
    // 优雅关闭应用
    process.exit(1);
  });

  // 进程退出信号处理
  process.on('SIGTERM', () => {
    logger.info('收到SIGTERM信号，准备关闭应用');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('收到SIGINT信号，准备关闭应用');
    process.exit(0);
  });
};

// 兼容旧接口
interface CustomError extends Error {
  status?: number;
}
