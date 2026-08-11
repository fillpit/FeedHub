/**
 * Cloudflare Kitesurf (Browser Rendering CDP) Fetcher Service
 * 控制运行于 Cloudflare Workers 之上的 Kitesurf 无头浏览器实例进行网页抓取。
 * 使用原生 HTTPS WebSocket Upgrade 握手，无需引入额外的外部依赖。
 */

import https from "https";
import crypto from "crypto";

export class KitesurfFetcher {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = KitesurfFetcher.normalizeUrl(url);
    this.token = token.trim();
  }

  /**
   * 规范化 Cloudflare Kitesurf CDP WebSocket 端点
   */
  public static normalizeUrl(urlStr: string): string {
    let u = urlStr.trim().replace(/\/+$/, "");
    if (u.endsWith("/browser-rendering/cdp")) {
      u = u.replace(/\/browser-rendering\/cdp$/, "/browser-rendering/devtools/browser");
    } else if (u.endsWith("/browser-rendering")) {
      u = `${u}/devtools/browser`;
    }
    return u;
  }

  /**
   * 建立 WebSocket 连接（带连接超时控制）
   */
  private async connectWs(timeoutMs = 15000): Promise<{
    sendCmd: (method: string, params?: Record<string, unknown>, sessionId?: string) => Promise<any>;
    close: () => void;
  }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.url);
      const secKey = crypto.randomBytes(16).toString("base64");

      let isFinished = false;

      const req = https.request({
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Upgrade: "websocket",
          Connection: "Upgrade",
          "Sec-WebSocket-Key": secKey,
          "Sec-WebSocket-Version": "13",
        },
      });

      const timer = setTimeout(() => {
        if (!isFinished) {
          isFinished = true;
          req.destroy();
          reject(new Error(`Kitesurf 连接超时 (${Math.round(timeoutMs / 1000)}秒)`));
        }
      }, timeoutMs);

      let socket: any = null;
      let buffer = Buffer.alloc(0);
      let msgId = 1;
      const pendingRequests = new Map<number, (res: any) => void>();
      const eventListeners: ((data: any) => void)[] = [];

      const sendCmd = (method: string, params: Record<string, unknown> = {}, sessionId?: string) => {
        const id = msgId++;
        const payloadStr = JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        });

        return new Promise<any>((res, rej) => {
          pendingRequests.set(id, (response: any) => {
            if (response.error) {
              rej(new Error(response.error.message || `CDP Error in ${method}`));
            } else {
              res(response.result);
            }
          });

          // 打包 WebSocket Frame 并发送
          const payload = Buffer.from(payloadStr, "utf-8");
          const len = payload.length;
          const maskKey = crypto.randomBytes(4);
          let header: Buffer;

          if (len <= 125) {
            header = Buffer.alloc(6);
            header[0] = 0x81; // FIN + Text frame
            header[1] = 0x80 | len;
            maskKey.copy(header, 2);
          } else if (len <= 65535) {
            header = Buffer.alloc(8);
            header[0] = 0x81;
            header[1] = 0x80 | 126;
            header.writeUInt16BE(len, 2);
            maskKey.copy(header, 4);
          } else {
            header = Buffer.alloc(14);
            header[0] = 0x81;
            header[1] = 0x80 | 127;
            header.writeBigUInt64BE(BigInt(len), 2);
            maskKey.copy(header, 10);
          }

          const maskedPayload = Buffer.alloc(len);
          for (let i = 0; i < len; i++) {
            maskedPayload[i] = payload[i] ^ maskKey[i % 4];
          }

          if (socket && !socket.destroyed) {
            socket.write(Buffer.concat([header, maskedPayload]));
          } else {
            rej(new Error("WebSocket 链接已断开"));
          }
        });
      };

      const parseFrames = () => {
        while (buffer.length >= 2) {
          const secondByte = buffer[1];
          const payloadLenIndicator = secondByte & 0x7f;
          let headerLen = 2;

          if (payloadLenIndicator === 126) headerLen += 2;
          else if (payloadLenIndicator === 127) headerLen += 8;

          if (buffer.length < headerLen) return;

          let payloadLen = payloadLenIndicator;
          if (payloadLenIndicator === 126) {
            payloadLen = buffer.readUInt16BE(2);
          } else if (payloadLenIndicator === 127) {
            payloadLen = Number(buffer.readBigUInt64BE(2));
          }

          if (buffer.length < headerLen + payloadLen) return;

          const payload = buffer.slice(headerLen, headerLen + payloadLen);
          buffer = buffer.slice(headerLen + payloadLen);

          try {
            const data = JSON.parse(payload.toString("utf-8"));
            if (data.id && pendingRequests.has(data.id)) {
              const cb = pendingRequests.get(data.id)!;
              pendingRequests.delete(data.id);
              cb(data);
            } else {
              eventListeners.forEach((fn) => fn(data));
            }
          } catch {}
        }
      };

      req.on("upgrade", (res, rawSocket) => {
        clearTimeout(timer);
        if (isFinished) return;
        isFinished = true;

        if (res.statusCode !== 101) {
          return reject(new Error(`Kitesurf 连接鉴权失败 (HTTP Status ${res.statusCode})`));
        }
        socket = rawSocket;

        socket.on("data", (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);
          parseFrames();
        });

        socket.on("error", (err: Error) => {
          // 清理挂起的请求
          pendingRequests.forEach((cb) => cb({ error: { message: err.message } }));
          pendingRequests.clear();
        });

        const close = () => {
          if (socket && !socket.destroyed) {
            try {
              socket.destroy();
            } catch {}
          }
        };

        resolve({ sendCmd, close });
      });

      req.on("error", (err) => {
        clearTimeout(timer);
        if (!isFinished) {
          isFinished = true;
          reject(err);
        }
      });

      req.end();
    });
  }

  /**
   * 使用 Kitesurf 服务抓取目标网页 HTML 内容（默认 30 秒总体抓取超时）
   */
  async fetch(targetUrl: string, timeoutMs = 30000): Promise<string> {
    let timer: NodeJS.Timeout | null = null;
    let closeSocketFn: (() => void) | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        if (closeSocketFn) {
          closeSocketFn();
        }
        reject(new Error(`Cloudflare Kitesurf 抓取超时 (${Math.round(timeoutMs / 1000)}秒)`));
      }, timeoutMs);
    });

    const fetchPromise = (async () => {
      const { sendCmd, close } = await this.connectWs(15000);
      closeSocketFn = close;
      let targetId: string | null = null;

      try {
        // 1. 创建并附加新标签页
        const createRes = await sendCmd("Target.createTarget", { url: "about:blank" });
        targetId = createRes.targetId;

        const attachRes = await sendCmd("Target.attachToTarget", { targetId, flatten: true });
        const sessionId = attachRes.sessionId;

        // 2. 启用 Page 视图并设置 User-Agent
        await sendCmd("Page.enable", {}, sessionId);
        try {
          await sendCmd("Network.setUserAgentOverride", {
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          }, sessionId);
        } catch {}

        // 3. 导航至目标 URL
        await sendCmd("Page.navigate", { url: targetUrl }, sessionId);

        // 4. 等待首屏加载与 SPA 动态渲染 (等待 2.5 秒)
        await new Promise((r) => setTimeout(r, 2500));

        // 5. 评估并获取页面全量 HTML
        const evalRes = await sendCmd("Runtime.evaluate", {
          expression: "document.documentElement.outerHTML",
          returnByValue: true,
        }, sessionId);

        const html = evalRes?.result?.value;
        if (!html) {
          throw new Error("未能从 Kitesurf 标签页获取 HTML 内容");
        }

        // 6. 清理标签页
        if (targetId) {
          await sendCmd("Target.closeTarget", { targetId }).catch(() => {});
        }

        return html;
      } finally {
        close();
      }
    })();

    try {
      return await Promise.race([fetchPromise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * 测试 Kitesurf 服务的连通性（默认 10 秒超时）
   */
  async testConnection(timeoutMs = 10000): Promise<{ version: string }> {
    let timer: NodeJS.Timeout | null = null;
    let closeSocketFn: (() => void) | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        if (closeSocketFn) closeSocketFn();
        reject(new Error(`Kitesurf 测试连接超时 (${Math.round(timeoutMs / 1000)}秒)`));
      }, timeoutMs);
    });

    const testPromise = (async () => {
      const { sendCmd, close } = await this.connectWs(10000);
      closeSocketFn = close;
      try {
        const versionInfo = await sendCmd("Browser.getVersion");
        const browser = versionInfo?.product || versionInfo?.userAgent || "Cloudflare Kitesurf Browser";
        return { version: browser };
      } finally {
        close();
      }
    })();

    try {
      return await Promise.race([testPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
