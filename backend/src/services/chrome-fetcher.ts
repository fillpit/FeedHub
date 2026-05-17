/**
 * Chrome Remote Debugging (CDP) Fetcher Service
 * 控制运行于本地或特定端口的 Google Chrome 浏览器实例进行高级网页抓取。
 * 无需安装 puppeteer 或 playwright 等重度依赖，使用原生 WebSocket 和 Fetch 实现。
 */

const TEST_PAGE_URL = "https://www.diggingfly.com/";

interface SimpleWebSocket {
  send(data: string): void;
  close(): void;
  readyState: number;
  onopen?: () => void;
  onerror?: (err: unknown) => void;
  onclose?: () => void;
  onmessage?: (event: { data: { toString(): string } }) => void;
}

export class ChromeFetcher {
  private debugUrl: string;

  constructor(debugUrl: string) {
    // 确保去除末尾的斜杠
    this.debugUrl = debugUrl.replace(/\/$/, "");
  }

  /**
   * 使用 Chrome 的远程调试接口抓取一个页面的 HTML 内容
   */
  async fetch(url: string): Promise<string> {
    const globalObj = globalThis as unknown as { WebSocket?: new (url: string) => SimpleWebSocket };
    const WS = globalObj.WebSocket;
    if (!WS) {
      throw new Error("当前 Node.js 环境不支持原生的 WebSocket，请升级至 Node.js v22 或更高版本。");
    }

    let targetId: string | null = null;
    let ws: SimpleWebSocket | null = null;

    try {
      // 1. 调用 Chrome API 创建一个新的空白标签页
      const createRes = await globalThis.fetch(`${this.debugUrl}/json/new?about:blank`, { method: "PUT" });
      if (!createRes.ok) {
        throw new Error(`无法创建新标签页: HTTP ${createRes.status} ${createRes.statusText}`);
      }
      const target = await createRes.json() as { id: string; webSocketDebuggerUrl: string };
      targetId = target.id;
      const wsUrl = target.webSocketDebuggerUrl;

      // 2. 通过 WebSocket 连接并控制该标签页
      ws = new WS(wsUrl);

      return await new Promise<string>((resolve, reject) => {
        let msgId = 1;
        const pendingRequests = new Map<number, { resolve: (val: unknown) => void; reject: (err: Error) => void }>();

        const sendCmd = (method: string, params: Record<string, unknown> = {}) => {
          const id = msgId++;
          const payload = JSON.stringify({ id, method, params });
          if (ws && ws.readyState === 1 /* OPEN */) {
            ws.send(payload);
          } else {
            throw new Error("WebSocket 连接未就绪");
          }
          return new Promise<unknown>((res, rej) => {
            pendingRequests.set(id, { resolve: res, reject: rej });
          });
        };

        // 设置 30s 整体抓取超时
        const timeout = setTimeout(() => {
          cleanup(new Error("Chrome 抓取超时 (30秒)"));
        }, 30000);

        const cleanup = (error?: Error) => {
          clearTimeout(timeout);
          if (ws) {
            try { ws.close(); } catch {}
          }
          if (targetId) {
            // 异步关闭标签页，避免阻塞
            globalThis.fetch(`${this.debugUrl}/json/close/${targetId}`).catch(() => { /* no-op */ });
          }
          if (error) {
            reject(error);
          }
        };

        if (!ws) {
          reject(new Error("WebSocket 连接未初始化"));
          return;
        }

        ws.onopen = async () => {
          try {
            // 开启 Page 域以接收加载事件
            await sendCmd("Page.enable");
            // 导航到目标 URL
            await sendCmd("Page.navigate", { url });
          } catch (err) {
            cleanup(err as Error);
          }
        };

        ws.onerror = (_event: unknown) => {
          cleanup(new Error(`WebSocket 控制标签页时出错`));
        };

        ws.onclose = () => {
          reject(new Error("WebSocket 连接被提前关闭"));
        };

        ws.onmessage = async (event: { data: { toString(): string } }) => {
          try {
            const data = JSON.parse(event.data.toString()) as { id?: number; error?: { message?: string }; result?: unknown; method?: string };

            // 匹配请求回调
            if (data.id && pendingRequests.has(data.id)) {
              const req = pendingRequests.get(data.id);
              if (req) {
                pendingRequests.delete(data.id);
                if (data.error) {
                  req.reject(new Error(data.error.message || "CDP 命令执行失败"));
                } else {
                  req.resolve(data.result);
                }
              }
              return;
            }

            // 当页面彻底完成首屏加载时
            if (data.method === "Page.loadEventFired") {
              // 额外等待 2.5 秒，以便单页应用（SPA）、异步 Ajax 以及 JS 彻底渲染完毕
              await new Promise((r) => setTimeout(r, 2500));

              // 评估并提取页面的完整 DOM (outerHTML)
              const evalResult = await sendCmd("Runtime.evaluate", {
                expression: "document.documentElement.outerHTML",
                returnByValue: true
              }) as { result?: { value?: string } };

              const html = evalResult?.result?.value;
              if (html) {
                resolve(html);
                cleanup();
              } else {
                cleanup(new Error("未能从标签页中提取到页面 HTML 内容"));
              }
            }
          } catch (err) {
            cleanup(err as Error);
          }
        };
      });

    } catch (err: unknown) {
      if (ws) {
        try { ws.close(); } catch {}
      }
      if (targetId) {
        await globalThis.fetch(`${this.debugUrl}/json/close/${targetId}`).catch(() => { /* no-op */ });
      }
      throw err;
    }
  }

  /**
   * 测试 Chrome 调试端点的连通性并打开测试网页
   */
  async testConnection(): Promise<{ version: string }> {
    try {
      const res = await globalThis.fetch(`${this.debugUrl}/json/version`);
      if (!res.ok) {
        throw new Error(`HTTP 状态码: ${res.status}`);
      }
      const data = await res.json() as { Browser: string };
      await this.openTestPage();
      return { version: data.Browser || "Unknown Chrome" };
    } catch (err: unknown) {
      throw new Error(`无法连接至 Chrome 调试端口 (${this.debugUrl}): ${err instanceof Error ? err.message : "未知错误"}`);
    }
  }

  /**
   * 控制 Chrome 浏览器打开测试网页
   */
  private async openTestPage(): Promise<void> {
    try {
      const openRes = await globalThis.fetch(`${this.debugUrl}/json/new?${TEST_PAGE_URL}`, { method: "PUT" });
      if (!openRes.ok) {
        throw new Error(`HTTP 状态码: ${openRes.status}`);
      }
    } catch (err: unknown) {
      throw new Error(`控制浏览器打开测试网页失败: ${err instanceof Error ? err.message : "未知错误"}`);
    }
  }
}
