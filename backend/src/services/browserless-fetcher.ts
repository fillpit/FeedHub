/**
 * Browserless Fetcher Service
 * 使用 Browserless 服务进行网页抓取和渲染。
 */

export class BrowserlessFetcher {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    // 确保去除末尾的斜杠
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  /**
   * 使用 Browserless 抓取一个页面的 HTML 内容
   */
  async fetch(targetUrl: string): Promise<string> {
    console.log(`[BrowserlessFetcher] Fetching via Browserless (${this.url}): ${targetUrl}`);
    const endpoint = `${this.url}/content?token=${this.token}`;
    const res = await globalThis.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl, waitFor: 3000, blockAds: true }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`Browserless 抓取失败 (HTTP ${res.status})`);
    }
    return await res.text();
  }

  /**
   * 测试 Browserless 服务的连通性
   */
  async testConnection(): Promise<{ version: string }> {
    const tokenQuery = this.token ? `?token=${this.token}` : "";
    try {
      const res = await globalThis.fetch(`${this.url}/status${tokenQuery}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json() as { status?: string; limit?: number };
        const statusMsg = data.status || "ok";
        return { version: `Browserless (Status: ${statusMsg}, Limit: ${data.limit ?? "无"})` };
      }
    } catch (err: any) {
      console.warn("[BrowserlessFetcher] /status failed, trying /json/version:", err.message);
    }

    const res = await globalThis.fetch(`${this.url}/json/version${tokenQuery}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      throw new Error(`HTTP 状态码: ${res.status}`);
    }
    const data = await res.json() as { Browser: string };
    return { version: data.Browser || "Unknown" };
  }
}
