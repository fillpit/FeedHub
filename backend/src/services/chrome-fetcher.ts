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
  onclose?: (event?: any) => void;
  onmessage?: (event: { data: { toString(): string } }) => void;
}

export class ChromeFetcher {
  private debugUrl: string;

  constructor(debugUrl: string) {
    // 确保去除末尾的斜杠
    this.debugUrl = debugUrl.replace(/\/$/, "");
  }

  /**
   * 规范并重写 WebSocket 的主机地址与协议，防止返回 0.0.0.0 或 127.0.0.1 导致远程连接失败
   */
  private normalizeWsUrl(wsUrl: string): string {
    if (!wsUrl) return wsUrl;
    try {
      const originalUrlObj = new URL(this.debugUrl);
      const wsUrlObj = new URL(wsUrl);
      wsUrlObj.host = originalUrlObj.host;
      wsUrlObj.protocol = originalUrlObj.protocol === "https:" ? "wss:" : "ws:";
      return wsUrlObj.toString();
    } catch {
      const host = this.debugUrl.replace(/^https?:\/\//, "");
      const isSecure = this.debugUrl.startsWith("https");
      let pathname = "/";
      try {
        const parts = wsUrl.split("://")[1]?.split("/");
        if (parts && parts.length > 1) {
          pathname = "/" + parts.slice(1).join("/");
        }
      } catch {}
      return `${isSecure ? "wss" : "ws"}://${host}${pathname}`;
    }
  }

  /**
   * 获取浏览器的主 WebSocket 连接端点
   */
  private async getBrowserWsUrl(): Promise<string> {
    try {
      const res = await globalThis.fetch(`${this.debugUrl}/json/version`);
      if (res.ok) {
        const data = (await res.json()) as { webSocketDebuggerUrl?: string };
        if (data.webSocketDebuggerUrl) {
          return this.normalizeWsUrl(data.webSocketDebuggerUrl);
        }
      }
    } catch {}

    try {
      const res = await globalThis.fetch(`${this.debugUrl}/json`);
      if (res.ok) {
        const list = (await res.json()) as { type: string; webSocketDebuggerUrl?: string }[];
        const browserTarget = list.find((t) => t.type === "browser");
        if (browserTarget && browserTarget.webSocketDebuggerUrl) {
          return this.normalizeWsUrl(browserTarget.webSocketDebuggerUrl);
        }
      }
    } catch {}

    // 备用：基于 debugUrl 直连构造
    const host = this.debugUrl.replace(/^https?:\/\//, "");
    const isSecure = this.debugUrl.startsWith("https");
    return `${isSecure ? "wss" : "ws"}://${host}/`;
  }

  /**
   * 使用 Chrome 的远程调试接口抓取一个页面的 HTML 内容（扁平化单连接 CDP 协议实现）
   */
  async fetch(url: string): Promise<string> {
    const globalObj = globalThis as unknown as { WebSocket?: new (url: string) => SimpleWebSocket };
    const WS = globalObj.WebSocket;
    if (!WS) {
      throw new Error("当前 Node.js 环境不支持原生的 WebSocket，请升级至 Node.js v22 或更高版本。");
    }

    const browserWsUrl = await this.getBrowserWsUrl();
    const ws = new WS(browserWsUrl);

    return await new Promise<string>((resolve, reject) => {
      let msgId = 1;
      let targetId: string | null = null;
      let sessionId: string | null = null;
      let isNewTarget = false;
      const pendingRequests = new Map<number, { resolve: (val: unknown) => void; reject: (err: Error) => void }>();

      const sendCmd = (method: string, params: Record<string, unknown> = {}, customSessionId?: string) => {
        const id = msgId++;
        // 只有在已经成功 attach 之后才自动注入当前会话的 sessionId
        const activeSessionId = customSessionId ? customSessionId : (sessionId ? sessionId : undefined);
        const payload = JSON.stringify({
          id,
          method,
          params,
          ...(activeSessionId ? { sessionId: activeSessionId } : {})
        });

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
          ws.onopen = undefined;
          ws.onerror = undefined;
          ws.onclose = undefined;
          ws.onmessage = undefined;
        }

        // 如果是新建的标签页，在关闭连通前通过主通道通知关闭该 target
        if (ws && ws.readyState === 1 && targetId && isNewTarget) {
          try {
            ws.send(JSON.stringify({
              id: msgId++,
              method: "Target.closeTarget",
              params: { targetId }
            }));
          } catch {}
        }

        if (ws) {
          try { ws.close(); } catch {}
        }

        if (error) {
          reject(error);
        }
      };

      ws.onopen = async () => {
        try {
          // 1. 创建新标签页
          try {
            const createRes = await sendCmd("Target.createTarget", { url: "about:blank" }) as { targetId: string };
            targetId = createRes.targetId;
            isNewTarget = true;
          } catch (createErr) {
            // 如果创建新标签失败，尝试获取并复用现有 page 标签页
            try {
              const targetsList = await sendCmd("Target.getTargets") as { targetInfos: { type: string; targetId: string }[] };
              const pageTarget = targetsList.targetInfos.find(t => t.type === "page");
              if (pageTarget) {
                targetId = pageTarget.targetId;
                isNewTarget = false;
              } else {
                throw new Error("未找到活跃标签页");
              }
            } catch (fallbackErr) {
              throw new Error(`创建或获取标签页失败: ${createErr instanceof Error ? createErr.message : String(createErr)} | ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
            }
          }

          // 2. 附加到标签页会话
          const attachRes = await sendCmd("Target.attachToTarget", { targetId, flatten: true }) as { sessionId: string };
          sessionId = attachRes.sessionId;

          // 3. 在会话中启用 Page 并导航
          await sendCmd("Page.enable");
          
          try {
            await sendCmd("Network.setUserAgentOverride", {
              userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            });
          } catch {}

          await sendCmd("Page.navigate", { url });
        } catch (err) {
          cleanup(err as Error);
        }
      };

      ws.onerror = (event: any) => {
        const errMsg = event?.message || event?.error?.message || "网络异常或连接握手失败";
        cleanup(new Error(`WebSocket 控制标签页时出错 (URL: ${browserWsUrl}): ${errMsg}`));
      };

      ws.onclose = (event: any) => {
        cleanup(new Error(`WebSocket 连接被提前关闭 (URL: ${browserWsUrl}, Code: ${event?.code || "None"}, Reason: ${event?.reason || "None"})`));
      };

      ws.onmessage = async (event: { data: { toString(): string } }) => {
        try {
          const data = JSON.parse(event.data.toString()) as { id?: number; error?: { message?: string }; result?: unknown; method?: string; params?: { sessionId?: string } };

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
          if (data.method === "Page.loadEventFired" || (data.params && data.params.sessionId && data.method === "Page.loadEventFired")) {
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
      const globalObj = globalThis as unknown as { WebSocket?: new (url: string) => SimpleWebSocket };
      const WS = globalObj.WebSocket;
      if (!WS) {
        throw new Error("当前 Node.js 环境不支持原生的 WebSocket，请升级至 Node.js v22 或更高版本。");
      }
      await this.fetch(TEST_PAGE_URL);
    } catch (err: unknown) {
      throw new Error(`控制浏览器打开测试网页失败: ${err instanceof Error ? err.message : "未知错误"}`);
    }
  }
}
