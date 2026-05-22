/**
 * CDP (Chrome DevTools Protocol) 服务
 */

export async function testCdpConnection(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const baseUrl = url.replace(/\/+$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8秒超时
    
    // 尝试一：请求标准 /json/version 接口 (最轻量，不需要新建标签页)
    try {
      const res = await fetch(`${baseUrl}/json/version`, { method: "GET", signal: controller.signal });
      if (res.ok) {
        clearTimeout(timeout);
        const data = (await res.json()) as { Browser?: string };
        return {
          success: true,
          message: `成功连接到 CDP！浏览器版本: ${data.Browser || "未知"}`
        };
      }
    } catch {
      // 忽略，尝试下一个接口
    }

    // 尝试二：请求 /json 列表接口 (获取所有已打开的页面列表)
    try {
      const res = await fetch(`${baseUrl}/json`, { method: "GET", signal: controller.signal });
      if (res.ok) {
        clearTimeout(timeout);
        const data = (await res.json()) as unknown[];
        return {
          success: true,
          message: `成功连接到 CDP！当前存在 ${data.length} 个活跃标签页`
        };
      }
    } catch {
      // 忽略，尝试最后一个接口
    }

    // 尝试三：备用方案，通过 /json/new 新开一个测试页面
    const targetUrl = "https://www.diggingfly.com/";
    const testUrl = `${baseUrl}/json/new?url=${encodeURIComponent(targetUrl)}`;
    
    const res = await fetch(testUrl, { method: "PUT", signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) {
      throw new Error(`HTTP 错误! 状态码: ${res.status}`);
    }
    
    const data = (await res.json()) as { id?: string };
    if (data.id) {
      // 异步关闭临时打开的测试页面
      fetch(`${baseUrl}/json/close/${data.id}`).catch(() => { /* no-op */ });
    }

    return { 
      success: true, 
      message: `成功连接到 CDP 并打开测试页面！页面 ID: ${data.id || "未知"}` 
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, message: "CDP 连接超时" };
    }
    return { 
      success: false, 
      message: `CDP 连接失败: ${err instanceof Error ? err.message : "连接失败"}` 
    };
  }
}
