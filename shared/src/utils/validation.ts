// 共享的验证工具函数

// 验证规则类型定义
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any, formData?: Record<string, any>) => boolean | string;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  firstError?: string;
}

// 常用验证规则
export const VALIDATION_RULES = {
  // 必填
  required: (message = '此字段为必填项'): ValidationRule => ({
    required: true,
    message
  }),

  // 字符串长度
  minLength: (min: number, message?: string): ValidationRule => ({
    min,
    message: message || `最少需要 ${min} 个字符`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    max,
    message: message || `最多允许 ${max} 个字符`
  }),

  length: (min: number, max: number, message?: string): ValidationRule => ({
    min,
    max,
    message: message || `长度必须在 ${min}-${max} 个字符之间`
  }),

  // 数值范围
  minValue: (min: number, message?: string): ValidationRule => ({
    min,
    message: message || `值不能小于 ${min}`
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    max,
    message: message || `值不能大于 ${max}`
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    min,
    max,
    message: message || `值必须在 ${min}-${max} 之间`
  }),

  // 邮箱
  email: (message = '请输入有效的邮箱地址'): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message
  }),

  // 手机号
  phone: (message = '请输入有效的手机号码'): ValidationRule => ({
    pattern: /^1[3-9]\d{9}$/,
    message
  }),

  // URL
  url: (message = '请输入有效的URL地址'): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message
  }),

  // 用户名（只能包含字母、数字和下划线，不能包含空格或汉字）
  username: (message = '用户名只能包含字母、数字和下划线，长度3-20位'): ValidationRule => ({
    pattern: /^[a-zA-Z0-9_]{3,20}$/,
    message
  }),

  // 密码（至少6位）
  password: (message = '密码至少6位'): ValidationRule => ({
    min: 6,
    message
  }),

  // 强密码（至少8位，包含大小写字母和数字）
  strongPassword: (message = '密码至少8位，必须包含大小写字母和数字'): ValidationRule => ({
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message
  }),

  // 中文姓名
  chineseName: (message = '请输入有效的中文姓名'): ValidationRule => ({
    pattern: /^[\u4e00-\u9fa5]{2,10}$/,
    message
  }),

  // 身份证号
  idCard: (message = '请输入有效的身份证号码'): ValidationRule => ({
    pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
    message
  }),

  // 自定义验证
  custom: (validator: (value: any, formData?: Record<string, any>) => boolean | string, message = '验证失败'): ValidationRule => ({
    custom: validator,
    message
  })
};

// 验证器类
export class Validator {
  private schema: ValidationSchema;

  constructor(schema: ValidationSchema) {
    this.schema = schema;
  }

  // 验证单个字段
  validateField(key: string, value: any, formData: Record<string, any> = {}): string[] {
    const rules = this.schema[key];
    if (!rules) return [];

    const ruleArray = Array.isArray(rules) ? rules : [rules];
    const errors: string[] = [];

    for (const rule of ruleArray) {
      const error = this.applyRule(value, rule, formData);
      if (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  // 验证整个对象
  validate(data: Record<string, any>): ValidationResult {
    const errors: Record<string, string[]> = {};
    let firstError: string | undefined;

    // 验证已有字段
    for (const [key, value] of Object.entries(data)) {
      const fieldErrors = this.validateField(key, value, data);
      if (fieldErrors.length > 0) {
        errors[key] = fieldErrors;
        if (!firstError) {
          firstError = fieldErrors[0];
        }
      }
    }

    // 检查必填字段
    for (const [key] of Object.entries(this.schema)) {
      if (!(key in data)) {
        const fieldErrors = this.validateField(key, undefined, data);
        if (fieldErrors.length > 0) {
          errors[key] = fieldErrors;
          if (!firstError) {
            firstError = fieldErrors[0];
          }
        }
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      firstError
    };
  }

  // 应用单个规则
  private applyRule(value: any, rule: ValidationRule, formData: Record<string, any>): string | null {
    // 如果值为空且不是必填，跳过验证
    if ((value === undefined || value === null || value === '') && !rule.required) {
      return null;
    }

    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      return rule.message || '此字段为必填项';
    }

    // 如果值为空，跳过其他验证
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // 长度/数值验证
    if (rule.min !== undefined) {
      const length = typeof value === 'string' ? value.length : Number(value);
      if (length < rule.min) {
        return rule.message || `值不能小于 ${rule.min}`;
      }
    }

    if (rule.max !== undefined) {
      const length = typeof value === 'string' ? value.length : Number(value);
      if (length > rule.max) {
        return rule.message || `值不能大于 ${rule.max}`;
      }
    }

    // 正则验证
    if (rule.pattern && !rule.pattern.test(String(value))) {
      return rule.message || '格式不正确';
    }

    // 自定义验证
    if (rule.custom) {
      const result = rule.custom(value, formData);
      if (result !== true) {
        return typeof result === 'string' ? result : rule.message || '验证失败';
      }
    }

    return null;
  }
}

// 常用验证函数
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

export const validateUrl = (url: string): boolean => {
  return /^https?:\/\/.+/.test(url);
};

export const validateUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

// 检查是否包含空格或汉字（用于用户名和密码验证）
export const isValidInput = (input: string): boolean => {
  const regex = /^[^\s\u4e00-\u9fa5]+$/;
  return regex.test(input);
};

// 密码强度检查
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('密码至少需要8位');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('需要包含小写字母');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('需要包含大写字母');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('需要包含数字');
  }

  if (/[@$!%*?&]/.test(password)) {
    score += 1;
  } else {
    feedback.push('建议包含特殊字符');
  }

  return { score, feedback };
};