// 验证规则类型定义
interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any, formData: Record<string, any>) => boolean | string;
  message?: string;
}

interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

interface ValidationResult {
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

  // 用户名
  username: (message = '用户名只能包含字母、数字和下划线，长度3-20位'): ValidationRule => ({
    pattern: /^[a-zA-Z0-9_]{3,20}$/,
    message
  }),

  // 密码强度（至少8位，包含大小写字母和数字）
  password: (message = '密码至少8位，必须包含大小写字母和数字'): ValidationRule => ({
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message
  }),

  // 强密码（至少8位，包含大小写字母、数字和特殊字符）
  strongPassword: (message = '密码至少8位，必须包含大小写字母、数字和特殊字符'): ValidationRule => ({
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
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
  custom: (validator: (value: any, formData: Record<string, any>) => boolean | string, message = '验证失败'): ValidationRule => ({
    custom: validator,
    message
  })
};

// 验证器类
class Validator {
  private schema: ValidationSchema;

  constructor(schema: ValidationSchema) {
    this.schema = schema;
  }

  // 验证单个字段
  validateField(key: string, value: any, formData: Record<string, any>): string[] {
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
    for (const [key, rules] of Object.entries(this.schema)) {
      if (!(key in data)) {
        const fieldErrors = this.validateField(key, undefined, data); // 传递 undefined 作为值，因为字段不存在
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
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return rule.message || '格式不正确';
      }
    }

    // 自定义验证
    if (rule.custom) {
      const result = rule.custom(value, formData);
      if (result === false) {
        return rule.message || '验证失败';
      } else if (typeof result === 'string') {
        return result;
      }
    }
    return null;
    
  }
}

// 快速验证函数
export const validate = {
  // 邮箱验证
  email: (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  // 手机号验证
  phone: (value: string): boolean => {
    return /^1[3-9]\d{9}$/.test(value);
  },

  // URL验证
  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // 用户名验证
  username: (value: string): boolean => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(value);
  },

  // 密码强度验证
  password: (value: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value);
  },

  // 强密码验证
  strongPassword: (value: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
  },

  // 非空验证
  required: (value: any): boolean => {
    return value !== undefined && value !== null && value !== '';
  },

  // 长度验证
  length: (value: string, min: number, max?: number): boolean => {
    if (max !== undefined) {
      return value.length >= min && value.length <= max;
    }
    return value.length >= min;
  },

  // 数值范围验证
  range: (value: number, min: number, max?: number): boolean => {
    if (max !== undefined) {
      return value >= min && value <= max;
    }
    return value >= min;
  }
};

// 表单验证 Hook（用于 Vue 3 Composition API）
export const useFormValidation = (schema: ValidationSchema) => {
  const validator = new Validator(schema);
  const errors = ref<Record<string, string[]>>({});
  const isValid = computed(() => Object.keys(errors.value).length === 0);

  const validateField = (key: string, value: any) => {
    const fieldErrors = validator.validateField(key, value, {});
    if (fieldErrors.length > 0) {
      errors.value[key] = fieldErrors;
    } else {
      delete errors.value[key];
    }
    return fieldErrors.length === 0;
  };

  const validateForm = (data: Record<string, any>) => {
    const result = validator.validate(data);
    errors.value = result.errors;
    return result;
  };

  const clearErrors = (key?: string) => {
    if (key) {
      delete errors.value[key];
    } else {
      errors.value = {};
    }
  };

  const getFieldError = (key: string): string | undefined => {
    return errors.value[key]?.[0];
  };

  const hasFieldError = (key: string): boolean => {
    return !!(errors.value[key] && errors.value[key].length > 0);
  };

  return {
    errors: readonly(errors),
    isValid,
    validateField,
    validateForm,
    clearErrors,
    getFieldError,
    hasFieldError
  };
};

// 导出
export { Validator };
export type { ValidationRule, ValidationSchema, ValidationResult };
export default Validator;

// 需要在文件顶部添加 Vue 相关导入
import { ref, computed, readonly } from 'vue';