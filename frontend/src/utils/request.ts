import axios, { AxiosResponse, AxiosRequestConfig, AxiosError } from "axios";
import { ElMessage, ElNotification } from "element-plus";
import { RequestResult } from "../types/response";
import { STORAGE_KEYS } from "@/constants/storage";
import { CSRFProtection, XSSProtection } from '@/utils/security';


// 清理请求数据中的潜在XSS内容
const sanitizeRequestData = (data: any): any => {
  return XSSProtection.sanitizeObject(data);
};

// 错误类型定义
interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  timestamp?: string;
  path?: string;
  method?: string;
}

// 重试配置
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

const defaultRetryConfig: RetryConfig = {
  retries: 2,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // 只对网络错误和5xx错误进行重试
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }
};

// 错误消息处理
const showErrorMessage = (error: ApiError | string, duration: number = 3000) => {
  if (typeof error === 'string') {
    ElMessage.error({ message: error, duration });
    return;
  }

  // 显示主要错误消息
  ElMessage.error({ message: error.message, duration });

  // 如果有详细的验证错误，显示通知
  if (error.errors && error.errors.length > 0) {
    const errorDetails = error.errors.map(err => `${err.field}: ${err.message}`).join('\n');
    ElNotification({
      title: '输入验证错误',
      message: errorDetails,
      type: 'error',
      duration: 5000,
      position: 'top-right'
    });
  }
};

// 成功消息处理
const showSuccessMessage = (message: string, duration: number = 2000) => {
  ElMessage.success({ message, duration });
};

// 网络状态检查
const isOnline = () => navigator.onLine;

// 重试逻辑
const retryRequest = async (config: AxiosRequestConfig, retryConfig: RetryConfig): Promise<any> => {
  let lastError: AxiosError;
  
  for (let i = 0; i <= retryConfig.retries; i++) {
    try {
      return await axiosInstance.request(config);
    } catch (error) {
      lastError = error as AxiosError;
      
      // 如果不满足重试条件或已达到最大重试次数，抛出错误
      if (i === retryConfig.retries || !retryConfig.retryCondition?.(lastError)) {
        throw lastError;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * (i + 1)));
    }
  }
  
  throw lastError!;
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 30000, // 增加超时时间
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
});

function isLoginAndRedirect(url: string) {
  return url.includes("/api/user/login") || url.includes("/api/user/register");
}

axiosInstance.interceptors.request.use(
  (config) => {
    // 检查网络状态
    if (!isOnline()) {
      showErrorMessage('网络连接已断开，请检查网络设置');
      return Promise.reject(new Error('网络连接已断开'));
    }

    // 添加请求时间戳
    (config as ExtendedInternalRequestConfig).metadata = { startTime: Date.now() };
    
    // 添加 CSRF 防护
    Object.assign(config.headers, CSRFProtection.setRequestHeader(config.headers));

    // 清理请求数据中的潜在XSS内容
    if (config.data && typeof config.data === 'object') {
      config.data = sanitizeRequestData(config.data);
    }

    
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isLoginAndRedirect(config.url || "")) {
      showErrorMessage("请先登录");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
      return Promise.reject(new Error('未登录'));
    }
    
    return config;
  },
  (error) => {
    showErrorMessage('请求配置错误');
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 记录响应时间
    const endTime = Date.now();
    const metadata = (response.config as ExtendedInternalRequestConfig).metadata;
    const startTime = metadata?.startTime || endTime;
    const duration = endTime - startTime;
    
    // 开发环境下记录请求耗时
    if (import.meta.env.DEV && duration > 3000) {
      console.warn(`慢请求警告: ${response.config.url} 耗时 ${duration}ms`);
    }
    
    const res = response.data;
    
    if (!res.success) {
      showErrorMessage(res);
      return Promise.reject(new Error(res.message));
    }
    
    return res;
  },
  async (error: AxiosError) => {
    const response = error.response;
    
    // 网络错误处理
    if (!response) {
      if (error.code === 'ECONNABORTED') {
        showErrorMessage('请求超时，请稍后重试');
      } else if (!isOnline()) {
        showErrorMessage('网络连接已断开，请检查网络设置');
      } else {
        showErrorMessage('网络错误，请检查网络连接');
      }
      return Promise.reject(error);
    }
    
    const status = response.status;
    const data = response.data as ApiError;
    
    switch (status) {
      case 400:
        showErrorMessage(data || '请求参数错误');
        break;
      case 401:
        showErrorMessage('登录已过期，请重新登录');
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
        break;
      case 403:
        showErrorMessage('权限不足，无法访问该资源');
        break;
      case 404:
        showErrorMessage('请求的资源不存在');
        break;
      case 429:
        showErrorMessage('请求过于频繁，请稍后重试');
        break;
      case 500:
        showErrorMessage('服务器内部错误，请稍后重试');
        break;
      case 502:
      case 503:
      case 504:
        showErrorMessage('服务暂时不可用，请稍后重试');
        break;
      default:
        showErrorMessage(data?.message || `请求失败 (${status})`);
    }
    
    return Promise.reject(error);
  }
);

// 扩展的请求配置
interface ExtendedRequestConfig extends AxiosRequestConfig {
  retry?: Partial<RetryConfig>;
  showSuccessMessage?: boolean;
  successMessage?: string;
  metadata?: {
    startTime: number;
  };
}

// 扩展内部请求配置类型
interface ExtendedInternalRequestConfig extends AxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

const request = {
  get: <T>(url: string, config?: ExtendedRequestConfig): Promise<RequestResult<T>> => {
    const finalConfig = { ...config };
    const retryConfig = { ...defaultRetryConfig, ...config?.retry };
    
    if (config?.retry) {
      return retryRequest({
        ...finalConfig,
        method: 'GET',
        url
      }, retryConfig);
    }
    
    return axiosInstance.get(url, finalConfig);
  },
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T, D = any>(
    url: string,
    data: D,
    config?: ExtendedRequestConfig
  ): Promise<RequestResult<T>> => {
    const finalConfig = { ...config };
    const retryConfig = { ...defaultRetryConfig, ...config?.retry };
    
    const requestPromise = config?.retry 
      ? retryRequest({
          ...finalConfig,
          method: 'POST',
          url,
          data
        }, retryConfig)
      : axiosInstance.post(url, data, finalConfig);
    
    // 如果需要显示成功消息
    if (config?.showSuccessMessage) {
      return requestPromise.then(result => {
        showSuccessMessage(config.successMessage || '操作成功');
        return result;
      });
    }
    
    return requestPromise;
  },
  
  put: <T, D = any>(
    url: string,
    data: D,
    config?: ExtendedRequestConfig
  ): Promise<RequestResult<T>> => {
    const finalConfig = { ...config };
    const retryConfig = { ...defaultRetryConfig, ...config?.retry };
    
    const requestPromise = config?.retry 
      ? retryRequest({
          ...finalConfig,
          method: 'PUT',
          url,
          data
        }, retryConfig)
      : axiosInstance.put(url, data, finalConfig);
    
    // 如果需要显示成功消息
    if (config?.showSuccessMessage) {
      return requestPromise.then(result => {
        showSuccessMessage(config.successMessage || '更新成功');
        return result;
      });
    }
    
    return requestPromise;
  },
  
  delete: <T>(url: string, config?: ExtendedRequestConfig): Promise<RequestResult<T>> => {
    const finalConfig = { ...config };
    const retryConfig = { ...defaultRetryConfig, ...config?.retry };
    
    const requestPromise = config?.retry 
      ? retryRequest({
          ...finalConfig,
          method: 'DELETE',
          url
        }, retryConfig)
      : axiosInstance.delete(url, finalConfig);
    
    // 如果需要显示成功消息
    if (config?.showSuccessMessage) {
      return requestPromise.then(result => {
        showSuccessMessage(config.successMessage || '删除成功');
        return result;
      });
    }
    
    return requestPromise;
  },
};

// 导出工具函数
export { showErrorMessage, showSuccessMessage, isOnline };
export default request;
