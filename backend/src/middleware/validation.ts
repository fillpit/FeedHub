import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// 输入验证规则接口
interface ValidationRule {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "email" | "url" | "array" | "object";
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
}

// 验证错误接口
interface ValidationError {
  field: string;
  message: string;
}

// 通用验证函数
const validateField = (value: unknown, rule: ValidationRule): ValidationError | null => {
  const { field, required, type, minLength, maxLength, pattern, custom } = rule;

  // 检查必填字段
  if (required && (value === undefined || value === null || value === "")) {
    return { field, message: `${field} 是必填字段` };
  }

  // 如果字段为空且非必填，跳过其他验证
  if (!required && (value === undefined || value === null || value === "")) {
    return null;
  }

  // 类型验证
  if (type) {
    switch (type) {
      case "string":
        if (typeof value !== "string") {
          return { field, message: `${field} 必须是字符串类型` };
        }
        break;
      case "number":
        if (typeof value !== "number" && isNaN(Number(value))) {
          return { field, message: `${field} 必须是数字类型` };
        }
        break;
      case "email": {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== "string" || !emailRegex.test(value)) {
          return { field, message: `${field} 必须是有效的邮箱地址` };
        }
        break;
      }
      case "url": {
        try {
          if (typeof value !== "string") {
            return { field, message: `${field} 必须是有效的URL` };
          }
          new URL(value);
        } catch {
          return { field, message: `${field} 必须是有效的URL` };
        }
        break;
      }
      case "array":
        if (!Array.isArray(value)) {
          return { field, message: `${field} 必须是数组类型` };
        }
        break;
      case "object":
        if (typeof value !== "object" || Array.isArray(value)) {
          return { field, message: `${field} 必须是对象类型` };
        }
        break;
    }
  }

  // 长度验证（仅对字符串和数组）
  if (typeof value === "string" || Array.isArray(value)) {
    if (minLength !== undefined && value.length < minLength) {
      return { field, message: `${field} 长度不能少于 ${minLength} 个字符` };
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return { field, message: `${field} 长度不能超过 ${maxLength} 个字符` };
    }
  }

  // 正则表达式验证
  if (pattern && typeof value === "string" && !pattern.test(value)) {
    return { field, message: `${field} 格式不正确` };
  }

  // 自定义验证
  if (custom) {
    const result = custom(value);
    if (result !== true) {
      return { field, message: typeof result === "string" ? result : `${field} 验证失败` };
    }
  }

  return null;
};

// 创建验证中间件
export const createValidationMiddleware = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];
    const data = { ...req.body, ...req.query, ...req.params };

    for (const rule of rules) {
      const error = validateField(data[rule.field], rule);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      logger.warn(`输入验证失败: ${JSON.stringify(errors)}`);
      return res.status(400).json({
        success: false,
        message: "输入验证失败",
        errors: errors,
      });
    }

    next();
  };
};

// 常用验证规则
export const commonValidationRules = {
  // 用户名验证
  username: {
    field: "username",
    required: true,
    type: "string" as const,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    custom: (value: string) => {
      if (/[\s\u4e00-\u9fa5]/.test(value)) {
        return "用户名不能包含空格或中文字符";
      }
      return true;
    },
  },

  // 密码验证
  password: {
    field: "password",
    required: true,
    type: "string" as const,
    minLength: 6,
    maxLength: 50,
  },

  // RSS配置名称验证
  configName: {
    field: "name",
    required: true,
    type: "string" as const,
    minLength: 1,
    maxLength: 100,
  },

  // URL验证
  url: {
    field: "url",
    required: true,
    type: "url" as const,
  },

  // ID验证
  id: {
    field: "id",
    required: true,
    type: "number" as const,
    custom: (value: unknown) => {
      const num = Number(value);
      return num > 0 || "ID必须是正整数";
    },
  },
};

// XSS防护函数
export const sanitizeInput = (input: unknown): unknown => {
  if (typeof input === "string") {
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    const sanitized: Record<string, unknown> = {};
    for (const key in input as Record<string, unknown>) {
      sanitized[key] = sanitizeInput((input as Record<string, unknown>)[key]);
    }
    return sanitized;
  }

  return input;
};

// XSS防护中间件
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  req.body = sanitizeInput(req.body) as typeof req.body;
  req.query = sanitizeInput(req.query) as typeof req.query;
  next();
};
