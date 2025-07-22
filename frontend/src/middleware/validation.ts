import { ValidationRule, ValidationSchema, VALIDATION_RULES } from '@/utils/validation';
import { showErrorMessage } from '@/utils/request';

// 验证中间件配置
interface ValidationMiddlewareConfig {
  showErrors?: boolean;
  stopOnFirstError?: boolean;
  validateOnBlur?: boolean;
  validateOnInput?: boolean;
  debounceTime?: number;
}

// 表单验证中间件
class FormValidationMiddleware {
  private schema: ValidationSchema;
  private config: ValidationMiddlewareConfig;
  private debounceTimers: Map<string, number> = new Map();
  private validationCache: Map<string, boolean> = new Map();

  constructor(schema: ValidationSchema, config: ValidationMiddlewareConfig = {}) {
    this.schema = schema;
    this.config = {
      showErrors: true,
      stopOnFirstError: false,
      validateOnBlur: true,
      validateOnInput: true,
      debounceTime: 300,
      ...config
    };
  }

  /**
   * 创建表单验证中间件
   */
  createFormMiddleware() {
    return {
      // 表单提交验证
      onSubmit: (formData: Record<string, any>) => {
        return this.validateForm(formData);
      },

      // 字段失焦验证
      onBlur: (fieldName: string, value: any) => {
        if (this.config.validateOnBlur) {
          return this.validateField(fieldName, value);
        }
        return { isValid: true, errors: [] };
      },

      // 字段输入验证（防抖）
      onInput: (fieldName: string, value: any) => {
        if (this.config.validateOnInput) {
          return this.debouncedValidateField(fieldName, value);
        }
        return Promise.resolve({ isValid: true, errors: [] });
      },

      // 获取字段验证规则
      getFieldRules: (fieldName: string) => {
        return this.schema[fieldName];
      },

      // 清除验证缓存
      clearCache: () => {
        this.validationCache.clear();
      }
    };
  }

  /**
   * 验证整个表单
   */
  private validateForm(formData: Record<string, any>) {
    const errors: Record<string, string[]> = {};
    let isValid = true;
    let firstError: string | undefined;

    // 验证所有字段, rules
    for (const [fieldName] of Object.entries(this.schema)) {
      const fieldValue = formData[fieldName];
      const fieldResult = this.validateField(fieldName, fieldValue);
      
      if (!fieldResult.isValid) {
        errors[fieldName] = fieldResult.errors;
        isValid = false;
        
        if (!firstError) {
          firstError = fieldResult.errors[0];
        }
        
        if (this.config.stopOnFirstError) {
          break;
        }
      }
    }

    // 显示错误信息
    if (!isValid && this.config.showErrors && firstError) {
      showErrorMessage(firstError);
    }

    return {
      isValid,
      errors,
      firstError
    };
  }

  /**
   * 验证单个字段
   */
  private validateField(fieldName: string, value: any) {
    const rules = this.schema[fieldName];
    if (!rules) {
      return { isValid: true, errors: [] };
    }

    const ruleArray = Array.isArray(rules) ? rules : [rules];
    const errors: string[] = [];

    for (const rule of ruleArray) {
      const error = this.applyRule(value, rule);
      if (error) {
        errors.push(error);
        if (this.config.stopOnFirstError) {
          break;
        }
      }
    }

    const isValid = errors.length === 0;
    
    // 更新缓存
    this.validationCache.set(fieldName, isValid);

    return { isValid, errors };
  }

  /**
   * 防抖验证字段
   */
  private debouncedValidateField(fieldName: string, value: any): Promise<{ isValid: boolean; errors: string[] }> {
    return new Promise((resolve) => {
      // 清除之前的定时器
      const existingTimer = this.debounceTimers.get(fieldName);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 设置新的定时器
      const timer = window.setTimeout(() => {
        const result = this.validateField(fieldName, value);
        this.debounceTimers.delete(fieldName);
        resolve(result);
      }, this.config.debounceTime);

      this.debounceTimers.set(fieldName, timer);
    });
  }

  /**
   * 应用验证规则
   */
  private applyRule(value: any, rule: ValidationRule): string | null {
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
      const result = rule.custom(value, {});
      if (result === false) {
        return rule.message || '验证失败';
      }
      if (typeof result === 'string') {
        return result;
      }
    }

    return null;
  }

  /**
   * 获取字段验证状态
   */
  getFieldValidationStatus(fieldName: string): boolean | undefined {
    return this.validationCache.get(fieldName);
  }

  /**
   * 更新验证规则
   */
  updateSchema(newSchema: ValidationSchema): void {
    this.schema = { ...this.schema, ...newSchema };
    this.validationCache.clear();
  }

  /**
   * 销毁中间件
   */
  destroy(): void {
    // 清除所有定时器
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.validationCache.clear();
  }
}

// 预定义的验证模式
export const VALIDATION_SCHEMAS = {
  // 用户登录
  login: {
    username: [
      VALIDATION_RULES.required('请输入用户名'),
      VALIDATION_RULES.minLength(3, '用户名至少3个字符')
    ],
    password: [
      VALIDATION_RULES.required('请输入密码'),
      VALIDATION_RULES.minLength(6, '密码至少6个字符')
    ]
  },

  // 用户注册
  register: {
    username: [
      VALIDATION_RULES.required('请输入用户名'),
      VALIDATION_RULES.username()
    ],
    email: [
      VALIDATION_RULES.required('请输入邮箱'),
      VALIDATION_RULES.email()
    ],
    password: [
      VALIDATION_RULES.required('请输入密码'),
      VALIDATION_RULES.password()
    ],
    confirmPassword: [
      VALIDATION_RULES.required('请确认密码'),
      VALIDATION_RULES.custom((value, formData) => {
        return value === formData?.password || '两次密码输入不一致';
      })
    ]
  },

  // RSS 配置
  rssConfig: {
    name: [
      VALIDATION_RULES.required('请输入配置名称'),
      VALIDATION_RULES.maxLength(50, '名称不能超过50个字符')
    ],
    url: [
      VALIDATION_RULES.required('请输入RSS地址'),
      VALIDATION_RULES.url('请输入有效的URL地址')
    ],
    description: [
      VALIDATION_RULES.maxLength(200, '描述不能超过200个字符')
    ]
  },

  // 网站RSS配置
  websiteRss: {
    websiteName: [
      VALIDATION_RULES.required('请输入网站名称'),
      VALIDATION_RULES.maxLength(100, '网站名称不能超过100个字符')
    ],
    websiteUrl: [
      VALIDATION_RULES.required('请输入网站地址'),
      VALIDATION_RULES.url('请输入有效的网站地址')
    ],
    rssUrl: [
      VALIDATION_RULES.required('请输入RSS地址'),
      VALIDATION_RULES.url('请输入有效的RSS地址')
    ]
  },

  // 设置
  settings: {
    theme: [
      VALIDATION_RULES.required('请选择主题')
    ],
    language: [
      VALIDATION_RULES.required('请选择语言')
    ],
    autoRefresh: [
      VALIDATION_RULES.required('请设置自动刷新')
    ],
    refreshInterval: [
      VALIDATION_RULES.required('请设置刷新间隔'),
      VALIDATION_RULES.minValue(1, '刷新间隔至少1分钟'),
      VALIDATION_RULES.maxValue(1440, '刷新间隔最多24小时')
    ]
  }
};

// 创建验证中间件的工厂函数
export const createValidationMiddleware = (
  schema: ValidationSchema | keyof typeof VALIDATION_SCHEMAS,
  config?: ValidationMiddlewareConfig
) => {
  const validationSchema = typeof schema === 'string' 
    ? VALIDATION_SCHEMAS[schema] 
    : schema;
  
  return new FormValidationMiddleware(validationSchema, config);
};

// Vue 3 组合式 API 支持
export const useValidationMiddleware = (
  schema: ValidationSchema | keyof typeof VALIDATION_SCHEMAS,
  config?: ValidationMiddlewareConfig
) => {
  const middleware = createValidationMiddleware(schema, config);
  const formMiddleware = middleware.createFormMiddleware();
  
  // 在组件卸载时清理
  if (typeof window !== 'undefined' && 'onUnmounted' in window) {
    (window as any).onUnmounted(() => {
      middleware.destroy();
    });
  }
  
  return {
    ...formMiddleware,
    middleware,
    getFieldValidationStatus: (fieldName: string) => 
      middleware.getFieldValidationStatus(fieldName),
    updateSchema: (newSchema: ValidationSchema) => 
      middleware.updateSchema(newSchema),
    destroy: () => middleware.destroy()
  };
};

// 实时验证装饰器
export const withRealTimeValidation = (
  element: HTMLInputElement | HTMLTextAreaElement,
  rules: ValidationRule | ValidationRule[],
  options: {
    showErrors?: boolean;
    debounceTime?: number;
    onValidation?: (isValid: boolean, errors: string[]) => void;
  } = {}
) => {
  const config = {
    showErrors: true,
    debounceTime: 300,
    ...options
  };
  
  const ruleArray = Array.isArray(rules) ? rules : [rules];
  let debounceTimer: number;
  
  const validate = (value: string) => {
    const errors: string[] = [];
    
    for (const rule of ruleArray) {
      // 简化的规则应用逻辑
      if (rule.required && !value.trim()) {
        errors.push(rule.message || '此字段为必填项');
        break;
      }
      
      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.message || '格式不正确');
        break;
      }
      
      if (value && rule.min !== undefined) {
        const length = value.length;
        if (length < rule.min) {
          errors.push(rule.message || `最少需要 ${rule.min} 个字符`);
          break;
        }
      }
      
      if (value && rule.max !== undefined) {
        const length = value.length;
        if (length > rule.max) {
          errors.push(rule.message || `最多允许 ${rule.max} 个字符`);
          break;
        }
      }
      
      if (rule.custom) {
        const result = rule.custom(value, {});
        if (result === false) {
          errors.push(rule.message || '验证失败');
          break;
        }
        if (typeof result === 'string') {
          errors.push(result);
          break;
        }
      }
    }
    
    const isValid = errors.length === 0;
    
    // 更新元素样式
    element.classList.toggle('is-invalid', !isValid);
    element.classList.toggle('is-valid', isValid && value.trim() !== '');
    
    // 显示错误信息
    if (config.showErrors && errors.length > 0) {
      showErrorMessage(errors[0]);
    }
    
    // 回调
    if (config.onValidation) {
      config.onValidation(isValid, errors);
    }
    
    return { isValid, errors };
  };
  
  const debouncedValidate = (value: string) => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      validate(value);
    }, config.debounceTime);
  };
  
  // 绑定事件
  element.addEventListener('input', (e) => {
    debouncedValidate((e.target as HTMLInputElement).value);
  });
  
  element.addEventListener('blur', (e) => {
    clearTimeout(debounceTimer);
    validate((e.target as HTMLInputElement).value);
  });
  
  // 返回清理函数
  return () => {
    clearTimeout(debounceTimer);
    element.classList.remove('is-invalid', 'is-valid');
  };
};

// 导出
export {
  FormValidationMiddleware
};
export type { ValidationMiddlewareConfig }

export default createValidationMiddleware;