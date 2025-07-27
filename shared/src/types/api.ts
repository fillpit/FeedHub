// 统一的API响应格式
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  timestamp?: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 错误详情
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// 详细错误响应
export interface DetailedErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
  details?: any;
  timestamp?: string;
  path?: string;
  method?: string;
}

// 请求配置
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

// 文件上传响应
export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string;
  mimeType?: string;
}

// 批量操作响应
export interface BatchOperationResponse {
  total: number;
  success: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}
