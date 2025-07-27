// 认证凭据相关的共享类型定义

export interface AuthCredential {
  id?: number;
  name: string;
  authType: "cookie" | "bearer" | "basic" | "custom";
  cookie?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  customHeaders?: Record<string, string>;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}
