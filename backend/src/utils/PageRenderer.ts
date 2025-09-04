import puppeteer, { Browser, Page } from "puppeteer";
import { WebsiteRssAuth } from "../../../shared/src/types/websiteRss";

export interface PageRenderOptions {
  url: string;
  auth?: WebsiteRssAuth;
  timeout?: number; // 页面加载超时时间（毫秒）
  waitForSelector?: string; // 等待特定选择器出现
  waitTime?: number; // 额外等待时间（毫秒），用于等待JavaScript执行
}

export class PageRenderer {
  private static browser: Browser | null = null;
  private static isInitializing = false;

  /**
   * 获取浏览器实例（单例模式）
   */
  private static async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    if (this.isInitializing) {
      // 等待初始化完成
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.browser && this.browser.connected) {
        return this.browser;
      }
    }

    this.isInitializing = true;
    try {
      const chromeServiceUrl = process.env.CHROME_SERVICE_URL;

      if (chromeServiceUrl) {
        // 连接到独立的Chrome服务容器
        try {
          // 构建连接URL，支持token认证
          const token = process.env.BROWSERLESS_TOKEN;
          let wsEndpoint = `ws://${chromeServiceUrl.replace("http://", "")}/`;

          if (token) {
            wsEndpoint += `?token=${token}`;
          }

          // 尝试连接到 browserless 服务
          this.browser = await puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
          });
        } catch (error) {
          console.warn(
            "Failed to connect to browserless service, trying direct connection:",
            error
          );
          // 回退到直接连接模式
          this.browser = await puppeteer.connect({
            browserURL: chromeServiceUrl,
          });
        }
      } else {
        // 本地开发环境，启动本地浏览器
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        });
      }
      return this.browser;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 渲染页面并获取HTML内容
   */
  static async renderPage(options: PageRenderOptions): Promise<string> {
    const { url, auth, timeout = 30000, waitForSelector, waitTime = 2000 } = options;

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 设置用户代理
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // 设置视口
      await page.setViewport({ width: 1920, height: 1080 });

      // 设置超时时间
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);

      // 设置授权信息
      if (auth?.enabled) {
        await this.setPageAuth(page, auth);
      }

      // 导航到页面
      await page.goto(url, {
        waitUntil: "networkidle2", // 等待网络空闲
        timeout,
      });

      // 等待特定选择器（如果指定）
      if (waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: 10000 });
        } catch (error) {
          console.warn(`等待选择器 ${waitForSelector} 超时:`, error);
        }
      }

      // 额外等待时间，确保JavaScript执行完成
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      // 获取渲染后的HTML内容
      const html = await page.content();
      return html;
    } catch (error) {
      console.error("页面渲染失败:", error);
      throw new Error(`页面渲染失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await page.close();
    }
  }

  /**
   * 设置页面授权信息
   */
  private static async setPageAuth(page: Page, auth: WebsiteRssAuth): Promise<void> {
    if (!auth.enabled) return;

    switch (auth.authType) {
      case "cookie":
        if (auth.cookie) {
          // 解析cookie字符串并设置
          const cookies = this.parseCookieString(auth.cookie);
          if (cookies.length > 0) {
            await page.setCookie(...cookies);
          }
        }
        break;

      case "basic":
        if (auth.basicAuth) {
          const { username, password } = auth.basicAuth;
          const credentials = Buffer.from(`${username}:${password}`).toString("base64");
          await page.setExtraHTTPHeaders({
            Authorization: `Basic ${credentials}`,
          });
        }
        break;

      case "bearer":
        if (auth.bearerToken) {
          await page.setExtraHTTPHeaders({
            Authorization: `Bearer ${auth.bearerToken}`,
          });
        }
        break;

      case "custom":
        if (auth.customHeaders) {
          await page.setExtraHTTPHeaders(auth.customHeaders);
        }
        break;
    }
  }

  /**
   * 解析cookie字符串
   */
  private static parseCookieString(
    cookieString: string
  ): Array<{ name: string; value: string; domain?: string; path?: string }> {
    const cookies: Array<{ name: string; value: string; domain?: string; path?: string }> = [];

    const cookiePairs = cookieString.split(";");
    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split("=");
      if (name && value) {
        cookies.push({
          name: name.trim(),
          value: value.trim(),
          domain: ".example.com", // 默认域名，实际使用时可能需要根据URL动态设置
          path: "/",
        });
      }
    }

    return cookies;
  }

  /**
   * 关闭浏览器实例
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 检查浏览器是否可用
   */
  static isBrowserAvailable(): boolean {
    return this.browser !== null && this.browser.connected;
  }
}

// 进程退出时关闭浏览器
process.on("exit", () => {
  PageRenderer.closeBrowser();
});

process.on("SIGINT", () => {
  PageRenderer.closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", () => {
  PageRenderer.closeBrowser();
  process.exit(0);
});
