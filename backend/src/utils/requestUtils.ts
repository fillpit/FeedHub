import { logger } from "./logger";

// 清理和验证Cookie值
export function sanitizeCookie(cookie: string): string {
  if (!cookie) return '';
  let sanitized = cookie.replace(/[\r\n\t]/g, '');
  sanitized = sanitized.replace(/^['"]|['"]$/g, '');
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  return sanitized.trim();
}

// 创建带有授权信息的请求配置
type AuthConfig = {
  enabled?: boolean;
  authType?: string;
  cookie?: string;
  basicAuth?: { username: string; password: string };
  bearerToken?: string;
  customHeaders?: Record<string, string>;
};

export function createRequestConfig(auth: AuthConfig): any {
  const config: any = {};
  if (!auth || !auth.enabled || auth.authType === "none") {
    return config;
  }
  switch (auth.authType) {
    case "cookie":
      if (auth.cookie) {
        try {
          const cookieValue = sanitizeCookie(auth.cookie);
          if (cookieValue) {
            config.headers = {
              ...config.headers,
              "Cookie": cookieValue
            };
          }
        } catch (error) {
          logger.warn(`Cookie值无效，跳过Cookie设置: ${(error as Error).message}`);
        }
      }
      break;
    case "basic":
      if (auth.basicAuth && auth.basicAuth.username && auth.basicAuth.password) {
        try {
          const credentials = Buffer.from(`${auth.basicAuth.username}:${auth.basicAuth.password}`).toString('base64');
          config.headers = {
            ...config.headers,
            "Authorization": `Basic ${credentials}`
          };
        } catch (error) {
          logger.warn(`Basic Auth配置无效: ${(error as Error).message}`);
        }
      }
      break;
    case "bearer":
      if (auth.bearerToken) {
        try {
          const token = auth.bearerToken.trim();
          if (token) {
            config.headers = {
              ...config.headers,
              "Authorization": `Bearer ${token}`
            };
          }
        } catch (error) {
          logger.warn(`Bearer Token无效: ${(error as Error).message}`);
        }
      }
      break;
    case "custom":
      if (auth.customHeaders) {
        try {
          config.headers = {
            ...config.headers,
            ...auth.customHeaders
          };
        } catch (error) {
          logger.warn(`自定义请求头配置无效: ${(error as Error).message}`);
        }
      }
      break;
  }
  return config;
} 