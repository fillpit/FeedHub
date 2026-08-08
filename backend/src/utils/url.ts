/**
 * 链接处理工具函数
 */

/**
 * 将相对 URL 解析为包含 Host 的完整绝对 URL
 * @param rawUrl 原始提取的 URL（可能是相对路径、协议相对路径或已是完整路径）
 * @param baseUrl 目标抓取页面的基准 URL
 */
export function resolveRelativeUrl(rawUrl: string, baseUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  // 已经是带有协议的绝对 URL (http://, https://, ftp:// 等)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // 特殊协议 (如 javascript:, mailto:, tel:) 不进行补齐
  if (/^(javascript|mailto|tel):/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalizedBase = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(baseUrl)
      ? baseUrl
      : `https://${baseUrl}`;
    return new URL(trimmed, normalizedBase).href;
  } catch {
    return trimmed;
  }
}
