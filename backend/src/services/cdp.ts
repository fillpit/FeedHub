/**
 * CDP (Chrome DevTools Protocol) 服务
 */

export async function testCdpConnection(url: string): Promise<{ success: boolean; message: string }> {
  try {
    // 移除末尾的斜杠
    const baseUrl = url.replace(/\/+$/, "");
    const targetUrl = "https://www.diggingfly.com/";
    const testUrl = `${baseUrl}/json/new?url=${encodeURIComponent(targetUrl)}`;
    
    // 设置超时时间
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10秒超时
    
    const res = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) {
      throw new Error(`HTTP 错误! 状态码: ${res.status}`);
    }
    
    const data = await res.json();
    return { 
      success: true, 
      message: `成功连接到 CDP 并打开网页！页面 ID: ${data.id || "未知"}` 
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, message: "CDP 连接超时" };
    }
    return { 
      success: false, 
      message: `CDP 连接失败: ${err.message}` 
    };
  }
}
