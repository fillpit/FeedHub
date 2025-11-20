import { injectable, inject } from "inversify";
import WebsiteRssConfig, {
  WebsiteRssConfigAttributes,
  WebsiteRssSelector,
} from "../models/WebsiteRssConfig";
import axios from "axios";
import { AxiosInstance } from "axios";
import { ApiResponseData } from "../utils/apiResponse";
import RSS from "rss";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import customParseFormat from "dayjs/plugin/customParseFormat";
import zhCN from "dayjs/locale/zh-cn";
// 工具函数导入
import { extractContentFromHtml } from "../utils/htmlExtractor";
import { formatDate } from "../utils/dateUtils";
import { createRequestConfig } from "../utils/requestUtils";

import { getFavicon } from "../utils/favicon";
import { validateselector } from "../utils/selectorValidator";
import AuthCredential from "../models/AuthCredential";
import { TYPES } from "../core/types";
import { NpmPackageService } from "./NpmPackageService";
import { NotificationService } from "./NotificationService";
import { PageRenderer } from "../utils/PageRenderer";

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.locale(zhCN); // 设置为中文

@injectable()
export class WebsiteRssService {
  private axiosInstance: AxiosInstance;
  private npmPackageService: NpmPackageService;
  private notificationService: NotificationService;

  constructor(
    @inject(TYPES.NpmPackageService) npmPackageService: NpmPackageService,
    @inject(TYPES.NotificationService) notificationService: NotificationService
  ) {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    this.npmPackageService = npmPackageService;
    this.notificationService = notificationService;
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<ApiResponseData<WebsiteRssConfigAttributes[]>> {
    // 直接数据库查询
    const configs = await WebsiteRssConfig.findAll();
    return { success: true, data: configs, message: "获取配置列表成功" };
  }

  /**
   * 根据ID获取配置
   */
  async getConfigById(id: number): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
    // 直接数据库查询
    const config = await WebsiteRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的网站RSS配置`);
    return { success: true, data: config, message: "获取配置成功" };
  }

  /**
   * 添加新配置
   */
  async addConfig(
    configData: Omit<WebsiteRssConfigAttributes, "id" | "lastContent" | "lastFetchTime">
  ): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
    // 检查是否已存在相同的URL
    const existingConfig = await WebsiteRssConfig.findOne({ where: { url: configData.url } });
    if (existingConfig) throw new Error("该网站URL已存在配置");
    // 自动生成 key
    if (!configData.key) configData.key = uuidv4().replace(/-/g, "").slice(0, 8);
    // 移除 id 字段，确保数据库自增
    if ("id" in configData) delete (configData as any).id;
    // 仅在非脚本模式下校验 selector
    validateselector(configData.selector);
    // 如果没有提供favicon，尝试从网站获取
    if (!configData.favicon) {
      try {
        configData.favicon = await getFavicon(configData.url, this.axiosInstance);
      } catch {
        configData.favicon = "";
      }
    }
    // 创建新配置
    const newConfig = await WebsiteRssConfig.create(configData);
    // 移除立即抓取内容的逻辑，只进行必要的语法检查
    // await this.fetchAndUpdateContent(newConfig.id);
    // 直接返回新创建的配置
    return { success: true, data: newConfig, message: "网站RSS配置添加成功" };
  }

  /**
   * 更新配置
   */
  async updateConfig(
    id: number,
    configData: Partial<WebsiteRssConfigAttributes>
  ): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
    // 查找原配置
    const config = await WebsiteRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的网站RSS配置`);
    // 仅在非脚本模式下校验 selector
    validateselector(configData.selector as WebsiteRssSelector);
    // 更新数据库
    await WebsiteRssConfig.update(configData, { where: { id } });
    // 返回最新配置
    const updatedConfig = await WebsiteRssConfig.findByPk(id);
    return { success: true, data: updatedConfig!, message: "网站RSS配置更新成功" };
  }

  /**
   * 删除配置
   */
  async deleteConfig(id: number): Promise<ApiResponseData<void>> {
    // 查找原配置
    const config = await WebsiteRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的网站RSS配置`);
    // 删除
    await WebsiteRssConfig.destroy({ where: { id } });
    return { success: true, data: undefined, message: "网站RSS配置删除成功" };
  }

  /**
   * 刷新内容
   */
  async refreshConfig(id: number): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
    // 查找原配置
    const config = await WebsiteRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的网站RSS配置`);
    // 重新抓取
    await this.fetchAndUpdateContent(config);

    // 返回最新配置
    const updatedConfig = await WebsiteRssConfig.findByPk(id);
    return { success: true, data: updatedConfig!, message: "网站RSS内容刷新成功" };
  }

  /**
   * 获取RSS Feed内容
   */
  async getRssFeed(key: string): Promise<string> {
    // 查找配置
    const config = await WebsiteRssConfig.findOne({ where: { key } });
    if (!config) throw new Error(`未找到key为${key}的网站RSS配置`);
    // 检查是否需要更新内容
    const now = new Date();
    const lastFetchTime = config.lastFetchTime || new Date(0);
    const minutesSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (60 * 1000);
    if (minutesSinceLastFetch >= config.fetchInterval) {
      await this.fetchAndUpdateContent(config);
      // 重新获取更新后的配置
      const updatedConfig = await WebsiteRssConfig.findByPk(config.id);
      if (updatedConfig) config.lastContent = updatedConfig.lastContent;
    }
    // 生成RSS XML
    return this.generateRssXml(config);
  }

  /**
   * 获取RSS Feed内容（JSON格式）
   */
  async getRssFeedJson(key: string): Promise<any> {
    // 查找配置
    const config = await WebsiteRssConfig.findOne({ where: { key } });
    if (!config) throw new Error(`未找到key为${key}的网站RSS配置`);
    // 检查是否需要更新内容
    const now = new Date();
    const lastFetchTime = config.lastFetchTime || new Date(0);
    const minutesSinceLastFetch = (now.getTime() - lastFetchTime.getTime()) / (60 * 1000);
    if (minutesSinceLastFetch >= config.fetchInterval) {
      await this.fetchAndUpdateContent(config);
      // 重新获取更新后的配置
      const updatedConfig = await WebsiteRssConfig.findByPk(config.id);
      if (updatedConfig) config.lastContent = updatedConfig.lastContent;
    }
    // 生成RSS JSON
    return this.generateRssJson(config);
  }

  /**
   * 抓取并更新内容
   */
  /**
   * 获取授权信息
   */
  private async getAuthInfo(authCredentialId?: number, existingAuth?: any): Promise<any> {
    let auth = existingAuth || { enabled: false, authType: "none" };

    if (authCredentialId) {
      const authObj = await AuthCredential.findByPk(authCredentialId);
      if (!authObj) throw new Error("未找到授权信息");

      let customHeaders: Record<string, string> | undefined = undefined;
      if (authObj.customHeaders && typeof authObj.customHeaders === "object") {
        try {
          customHeaders = JSON.parse(JSON.stringify(authObj.customHeaders));
        } catch {
          customHeaders = undefined;
        }
      }

      auth = { ...authObj.toJSON(), enabled: true, authType: authObj.authType, customHeaders };
    }

    return auth;
  }

  /**
   * 获取网页内容（支持渲染模式）
   */
  private async fetchPageContent(
    url: string,
    auth: any,
    renderMode: string = "static",
    logs?: string[]
  ): Promise<string> {
    const requestConfig = createRequestConfig(auth);
    let html: string;
    let msg: string;

    msg = `使用渲染模式: ${renderMode}`;
    console.log(msg);
    if (logs) {
      logs.push(`[INFO] 使用渲染模式: ${renderMode}`);
    }

    if (renderMode === "rendered") {
      // 使用浏览器渲染模式
      msg = `使用浏览器渲染模式获取页面: ${url}`;
      console.log(msg);
      // 记录日志
      if (logs) {
        logs.push(`[INFO] ${msg}`);
      }

      try {
        html = await PageRenderer.renderPage({
          url: url,
          auth: auth,
          timeout: 30000,
          waitTime: 2000, // 等待2秒确保JavaScript执行完成
        });

        msg = `浏览器渲染成功: ${url}`;
        console.log(msg);
        if (logs) {
          logs.push(`[INFO] ${msg}`);
        }
      } catch (error) {
        msg = `浏览器渲染失败，回退到静态模式: ${error}`;
        console.warn(msg);
        if (logs) {
          logs.push(`[WARN] ${msg}`);
        }

        // 回退到静态模式
        const response = await this.axiosInstance.get(url, requestConfig);
        html = response.data;

        msg = `静态模式获取成功，状态码: ${response.status}`;
        console.log(msg);
        if (logs) {
          logs.push(`[INFO] ${msg}`);
        }
      }
    } else {
      // 静态模式（默认）
      msg = `正在使用静态模式获取网页内容...`;
      console.log(msg);
      if (logs) {
        logs.push(`[INFO] ${msg}`);
      }

      const response = await this.axiosInstance.get(url, requestConfig);
      html = response.data;

      msg = `网页获取成功，状态码: ${response.status}`;
      console.log(msg);
      if (logs) {
        logs.push(`[INFO] ${msg}`);
        logs.push(`[INFO] 响应头: ${JSON.stringify(response.headers, null, 2)}`);
      }
    }

    msg = `网页内容长度: ${html.length} 字符`;
    console.log(msg);
    if (logs) {
      logs.push(`[INFO] ${msg}`);
    }

    return html;
  }

  /**
   * 刷新配置后更新内容
   */
  private async fetchAndUpdateContent(config: WebsiteRssConfigAttributes): Promise<void> {
    try {
      const content = await this.fetchContent(config, undefined);

      // 抓取成功，更新内容与状态
      await WebsiteRssConfig.update(
        (
          {
            lastContent: JSON.stringify(content),
            lastFetchTime: new Date(),
            lastFetchStatus: "success",
            lastFetchError: null,
          } as any
        ),
        { where: { id: config.id } }
      );
    } catch (error: any) {
      // 抓取失败，仅更新状态与错误摘要，保留原有lastContent
      await WebsiteRssConfig.update(
        (
          {
            lastFetchStatus: "failure",
            lastFetchError: error?.message || String(error),
          } as any
        ),
        { where: { id: config.id } }
      );
      // 继续抛出错误以保持原有调用方逻辑
      throw error;
    }
  }

  /**
   * 抓取内容
   */
  private async fetchContent(config: WebsiteRssConfigAttributes, logs?: string[]): Promise<any> {
    let msg: string;
    try {
      // 获取授权信息
      const auth = await this.getAuthInfo(config.authCredentialId, config.auth);
      config.auth = auth;
      if (config.authCredentialId && auth.enabled) {
        msg = `获取授权信息: ${auth.name || "Unknown"} (${auth.authType})`;
        console.log(msg);
        if (logs) {
          logs.push(`[INFO] ${msg}`);
        }
      }

      // 获取网页内容
      const renderMode = config.renderMode || "static";
      const html = await this.fetchPageContent(config.url, auth, renderMode, logs);

      // 提取内容并格式化日期
      msg = `开始使用选择器提取内容...`;
      console.log(msg);
      if (logs) {
        logs.push(`[INFO] ${msg}`);
      }

      const extractedContent = extractContentFromHtml(
        html,
        config.selector as WebsiteRssSelector,
        config.url,
        logs
      );

      msg = `提取完成，共找到 ${extractedContent.length} 个项目`;
      console.log(msg);
      if (logs) {
        logs.push(`[INFO] ${msg}`);
      }

      // 格式化日期
      const formattedContent = extractedContent.map((item) => ({
        ...item,
        pubDate: formatDate(item.pubDate, (config.selector as WebsiteRssSelector).dateFormat),
      }));

      return formattedContent;
    } catch (error: any) {
      console.error(`RSS订阅更新失败 [ID: ${config.id}]:`, error.message);
      if (logs) {
        logs.push(`[ERROR] RSS订阅更新失败 [ID: ${config.id}]: ${error.message}`);
      }
      // 重新抛出错误，保持原有的错误处理逻辑
      throw error;
    }
  }

  /**
   * 生成RSS XML
   */
  private generateRssXml(config: WebsiteRssConfigAttributes): string {
    // 构建RSS Feed
    const feed = new RSS({
      title: config.title,
      description: config.rssDescription || config.title,
      feed_url: `${process.env.API_BASE_URL || ""}/api/website-rss/${config.key}`,
      site_url: config.url,
      image_url: config.favicon,
      generator: "FeedHub WebsiteRSS",
      pubDate: new Date(),
    });
    // 添加项目
    if (config.lastContent) {
      const items = JSON.parse(config.lastContent);
      items.forEach((item: any) => {
        const itemOptions: any = {
          title: item.title,
          description: item.content || item.contentSnippet || "",
          url: item.link,
          guid: item.guid,
          date: item.pubDate,
          author: item.author,
        };

        // 添加封面图片作为enclosure（如果存在）
        if (item.image || item.coverImage || item.thumbnail) {
          const imageUrl = item.image || item.coverImage || item.thumbnail;
          itemOptions.enclosure = {
            url: imageUrl,
            type: "image/jpeg", // 默认类型，实际应用中可根据图片URL后缀判断
          };
        }

        feed.item(itemOptions);
      });
    }
    return feed.xml({ indent: true });
  }

  /**
   * 生成RSS JSON数据
   */
  private generateRssJson(config: WebsiteRssConfigAttributes): any {
    // 构建RSS Feed JSON结构
    const feedJson: any = {
      title: config.title,
      description: config.rssDescription || config.title,
      feed_url: `${process.env.API_BASE_URL || ""}/api/json/${config.key}`,
      site_url: config.url,
      image_url: config.favicon,
      generator: "FeedHub WebsiteRSS",
      pubDate: new Date().toISOString(),
      items: [],
    };

    // 添加项目
    if (config.lastContent) {
      const items = JSON.parse(config.lastContent);
      feedJson.items = items.map((item: any) => {
        const jsonItem: any = {
          title: item.title,
          description: item.content || item.contentSnippet || "",
          url: item.link,
          guid: item.guid,
          date: item.pubDate,
          author: item.author,
        };

        // 添加封面图片（如果存在）
        if (item.image || item.coverImage || item.thumbnail) {
          jsonItem.image = item.image || item.coverImage || item.thumbnail;
        }

        return jsonItem;
      });
    }

    return feedJson;
  }

  /**
   * 调试选择器配置
   */
  async debugSelector(configData: any): Promise<ApiResponseData<any>> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`[INFO] 开始调试选择器配置`);
      logs.push(`[DEBUG] 目标URL: ${configData.url}`);
      logs.push(`[DEBUG] 选择器配置: ${JSON.stringify(configData.selector, null, 2)}`);

      // 重新抓取
      const formattedContent = await this.fetchContent(configData, logs);

      const executionTime = Date.now() - startTime;
      logs.push(`[INFO] 调试完成，耗时: ${executionTime}ms`);

      return {
        success: true,
        data: {
          success: true,
          result: formattedContent,
          logs,
          executionTime,
          totalItems: formattedContent.length,
        },
        message: "选择器调试成功",
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logs.push(`[ERROR] 调试失败: ${error.message}`);
      if (error.stack) {
        logs.push(`[ERROR] 错误堆栈: ${error.stack}`);
      }

      return {
        success: false,
        data: {
          success: false,
          error: error.message,
          stack: error.stack,
          logs,
          executionTime,
        },
        message: "选择器调试失败",
      };
    }
  }
}
