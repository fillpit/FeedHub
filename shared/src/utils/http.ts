// 共享的HTTP请求工具函数
import type { ApiResponse, RequestConfig } from '../types/api';
import { HTTP_STATUS, ERROR_CODES, TIMEOUTS, RETRY_CONFIG } from '../constants';
import { AppError, NetworkError, ErrorHandler } from './error';

/**
 * HTTP请求方法枚举
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * 请求拦截器类型
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

/**
 * 响应拦截器类型
 */
export type ResponseInterceptor<T = any> = (response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;

/**
 * 错误拦截器类型
 */
export type ErrorInterceptor = (error: Error) => Error | Promise<Error>;

/**
 * HTTP客户端配置
 */
export interface HttpClientConfig extends RequestConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptors?: ErrorInterceptor[];
}

/**
 * HTTP请求选项
 */
export interface HttpRequestOptions extends RequestConfig {
  method?: HttpMethod;
  url: string;
  data?: any;
  params?: Record<string, any>;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
}

/**
 * HTTP响应
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * 构建查询字符串
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * 解析URL
 */
export function parseURL(url: string, baseURL?: string): URL {
  try {
    return new URL(url, baseURL);
  } catch (error) {
    throw new AppError(`无效的URL: ${url}`, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);
  }
}

/**
 * 合并请求配置
 */
export function mergeConfig(defaultConfig: RequestConfig, requestConfig: RequestConfig): RequestConfig {
  return {
    ...defaultConfig,
    ...requestConfig,
    headers: {
      ...defaultConfig.headers,
      ...requestConfig.headers
    }
  };
}

/**
 * 检查响应状态
 */
export function checkResponseStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * 格式化请求头
 */
export function formatHeaders(headers: Record<string, any>): Record<string, string> {
  const formattedHeaders: Record<string, string> = {};
  
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formattedHeaders[key] = String(value);
    }
  });
  
  return formattedHeaders;
}

/**
 * 创建超时Promise
 */
export function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AppError(
        `请求超时 (${timeout}ms)`,
        ERROR_CODES.NETWORK_ERROR,
        HTTP_STATUS.BAD_REQUEST
      ));
    }, timeout);
  });
}

/**
 * 重试函数
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.DEFAULT_RETRIES,
  delay: number = RETRY_CONFIG.DEFAULT_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // 如果是不应重试的错误，直接抛出
      if (error instanceof AppError) {
        const nonRetryableCodes = [
          ERROR_CODES.AUTHENTICATION_ERROR,
          ERROR_CODES.AUTHORIZATION_ERROR,
          ERROR_CODES.VALIDATION_ERROR,
          ERROR_CODES.RESOURCE_NOT_FOUND
        ];
        if (nonRetryableCodes.includes(error.code as any)) {
          throw error;
        }
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

/**
 * 检查网络连接
 */
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // 服务端默认认为在线
}

/**
 * 获取用户代理
 */
export function getUserAgent(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent;
  }
  return 'Node.js'; // 服务端默认
}

/**
 * 检测内容类型
 */
export function detectContentType(data: any): string {
  if (data instanceof FormData) {
    return 'multipart/form-data';
  }
  if (data instanceof URLSearchParams) {
    return 'application/x-www-form-urlencoded';
  }
  if (typeof data === 'object') {
    return 'application/json';
  }
  return 'text/plain';
}

/**
 * 序列化请求数据
 */
export function serializeData(data: any, contentType: string): string | FormData | URLSearchParams {
  if (!data) {
    return '';
  }
  
  if (data instanceof FormData || data instanceof URLSearchParams) {
    return data;
  }
  
  if (contentType.includes('application/json')) {
    return JSON.stringify(data);
  }
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    });
    return params;
  }
  
  return String(data);
}

/**
 * 解析响应数据
 */
export async function parseResponseData(response: Response, responseType: string = 'json'): Promise<any> {
  try {
    switch (responseType) {
      case 'json':
        return await response.json();
      case 'text':
        return await response.text();
      case 'blob':
        return await response.blob();
      case 'arrayBuffer':
        return await response.arrayBuffer();
      default:
        return await response.text();
    }
  } catch (error) {
    throw new AppError(
      '响应数据解析失败',
      ERROR_CODES.NETWORK_ERROR,
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

/**
 * 创建取消令牌
 */
export class CancelToken {
  private controller: AbortController;
  public signal: AbortSignal;
  
  constructor() {
    this.controller = new AbortController();
    this.signal = this.controller.signal;
  }
  
  cancel(reason?: string): void {
    this.controller.abort(reason);
  }
  
  static source(): { token: CancelToken; cancel: (reason?: string) => void } {
    const token = new CancelToken();
    return {
      token,
      cancel: (reason?: string) => token.cancel(reason)
    };
  }
}

/**
 * HTTP状态码工具
 */
export class HttpStatusUtils {
  static isInformational(status: number): boolean {
    return status >= 100 && status < 200;
  }
  
  static isSuccess(status: number): boolean {
    return status >= 200 && status < 300;
  }
  
  static isRedirection(status: number): boolean {
    return status >= 300 && status < 400;
  }
  
  static isClientError(status: number): boolean {
    return status >= 400 && status < 500;
  }
  
  static isServerError(status: number): boolean {
    return status >= 500 && status < 600;
  }
  
  static getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    
    return statusTexts[status] || 'Unknown Status';
  }
}

/**
 * 请求缓存
 */
export class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  createKey(method: string, url: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${method}:${url}:${paramsStr}`;
  }
}

/**
 * 请求限流器
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60 * 1000 // 1分钟
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // 清理过期的请求记录
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
  
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}