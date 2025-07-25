import { injectable, inject } from "inversify";
import WebsiteRssConfig, { WebsiteRssConfigAttributes, WebsiteRssSelector } from "../models/WebsiteRssConfig";
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
import { createScriptContext, executeScript, validateScriptResult } from "../utils/scriptRunner";
import { getFavicon } from "../utils/favicon";
import { validateselector } from "../utils/selectorValidator";
import AuthCredential from "../models/AuthCredential";
import { TYPES } from "../core/types";
import { NpmPackageService } from "./NpmPackageService";

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.locale(zhCN); // 设置为中文

@injectable()
export class WebsiteRssService {
  private axiosInstance: AxiosInstance;
  private npmPackageService: NpmPackageService;

  constructor(@inject(TYPES.NpmPackageService) npmPackageService: NpmPackageService) {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    this.npmPackageService = npmPackageService;
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
  async addConfig(configData: Omit<WebsiteRssConfigAttributes, "id" | "lastContent" | "lastFetchTime">): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
    // 检查是否已存在相同的URL
    const existingConfig = await WebsiteRssConfig.findOne({ where: { url: configData.url } });
    if (existingConfig) throw new Error("该网站URL已存在配置");
    // 自动生成 key
    if (!configData.key) configData.key = uuidv4().replace(/-/g, '').slice(0, 8);
    // 移除 id 字段，确保数据库自增
    if ('id' in configData) delete (configData as any).id;
    // 仅在非脚本模式下校验 selector
    const isScriptMode = configData.script && configData.script.enabled;
    if (!isScriptMode) validateselector(configData.selector);
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
    // 立即抓取一次内容
    await this.fetchAndUpdateContent(newConfig.id);
    // 重新获取更新后的配置
    const updatedConfig = await WebsiteRssConfig.findByPk(newConfig.id);
    return { success: true, data: updatedConfig!, message: "网站RSS配置添加成功" };
  }

  /**
   * 更新配置
   */
  async updateConfig(id: number, configData: Partial<WebsiteRssConfigAttributes>): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
    // 查找原配置
    const config = await WebsiteRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的网站RSS配置`);
    // 仅在非脚本模式下校验 selector
    const isScriptMode = configData.script && configData.script.enabled;
    if (!isScriptMode) validateselector(configData.selector as WebsiteRssSelector);
    // 更新数据库
    await WebsiteRssConfig.update(configData, { where: { id } });
    // 如果更新了URL或选择器，立即重新抓取
    if (configData.url || configData.selector) await this.fetchAndUpdateContent(id);
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
    await this.fetchAndUpdateContent(id);
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
      await this.fetchAndUpdateContent(config.id);
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
      await this.fetchAndUpdateContent(config.id);
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
  private async fetchAndUpdateContent(id: number): Promise<void> {
    // 查找配置
    const config = await WebsiteRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的网站RSS配置`);
    // 兼容性处理：确保 auth 字段存在
    let auth = config.auth || { enabled: false, authType: "none" };
    // 新增：如有authCredentialId，查库组装
    if (config.authCredentialId) {
      const authObj = await AuthCredential.findByPk(config.authCredentialId);
      if (!authObj) throw new Error("未找到授权信息");
      let customHeaders: Record<string, string> | undefined = undefined;
      if (authObj.customHeaders && typeof authObj.customHeaders === 'object') {
        try {
          customHeaders = JSON.parse(JSON.stringify(authObj.customHeaders));
        } catch {
          customHeaders = undefined;
        }
      }
      auth = { ...authObj.toJSON(), enabled: true, authType: authObj.authType, customHeaders };
      config.auth = auth;
    }
    // 创建带有授权信息的请求配置
    const requestConfig = createRequestConfig(auth);
    let extractedContent: any[] = [];
    // 选择器抓取模式（默认）
    const response = await this.axiosInstance.get(config.url, requestConfig);
    const html = response.data;
    // 提取内容并格式化日期
    extractedContent = extractContentFromHtml(html, config.selector as WebsiteRssSelector, config.url)
      .map(item => ({
        ...item,
        pubDate: formatDate(item.pubDate, (config.selector as WebsiteRssSelector).dateFormat)
      }));

    console.log('extractedContent', extractedContent)
    // 更新配置
    await WebsiteRssConfig.update(
      {
        lastContent: JSON.stringify(extractedContent),
        lastFetchTime: new Date(),
      },
      { where: { id } }
    );
  }

  /**
   * 生成RSS XML
   */
  private generateRssXml(config: WebsiteRssConfigAttributes): string {
    // 构建RSS Feed
    const feed = new RSS({
      title: config.title,
      description: config.rssDescription || config.title,
      feed_url: `${process.env.API_BASE_URL || ''}/api/website-rss/${config.key}`,
      site_url: config.url,
      image_url: config.favicon,
      generator: 'FeedHub WebsiteRSS',
      pubDate: new Date(),
    });
    // 添加项目
    if (config.lastContent) {
      const items = JSON.parse(config.lastContent);
      items.forEach((item: any) => {
        const itemOptions: any = {
          title: item.title,
          description: item.content || item.contentSnippet || '',
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
            type: 'image/jpeg' // 默认类型，实际应用中可根据图片URL后缀判断
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
      feed_url: `${process.env.API_BASE_URL || ''}/api/json/${config.key}`,
      site_url: config.url,
      image_url: config.favicon,
      generator: 'FeedHub WebsiteRSS',
      pubDate: new Date().toISOString(),
      items: []
    };
    
    // 添加项目
    if (config.lastContent) {
      const items = JSON.parse(config.lastContent);
      feedJson.items = items.map((item: any) => {
        const jsonItem: any = {
          title: item.title,
          description: item.content || item.contentSnippet || '',
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

      // 获取授权信息
      let auth = configData.auth || { enabled: false, authType: "none" };
      if (configData.authCredentialId) {
        const authObj = await AuthCredential.findByPk(configData.authCredentialId);
        if (authObj) {
          let customHeaders: Record<string, string> | undefined = undefined;
          if (authObj.customHeaders && typeof authObj.customHeaders === 'object') {
            try {
              customHeaders = JSON.parse(JSON.stringify(authObj.customHeaders));
            } catch {
              customHeaders = undefined;
            }
          }
          auth = { ...authObj.toJSON(), enabled: true, authType: authObj.authType, customHeaders };
          logs.push(`[INFO] 使用授权信息: ${authObj.name} (${authObj.authType})`);
        } else {
          logs.push(`[WARN] 未找到授权信息，ID: ${configData.authCredentialId}`);
        }
      }

      // 创建请求配置
      const requestConfig = createRequestConfig(auth);
      logs.push(`[DEBUG] 请求配置: ${JSON.stringify(requestConfig, null, 2)}`);

      // 获取网页内容
      logs.push(`[INFO] 正在获取网页内容...`);
      const response = await this.axiosInstance.get(configData.url, requestConfig);
      logs.push(`[INFO] 网页获取成功，状态码: ${response.status}`);
      logs.push(`[INFO] 响应头: ${JSON.stringify(response.headers, null, 2)}`);
      
      const html = response.data;
      logs.push(`[INFO] 网页内容长度: ${html.length} 字符`);

      // 使用选择器提取内容
      logs.push(`[INFO] 开始使用选择器提取内容...`);
      const extractedContent = extractContentFromHtml(html, configData.selector as WebsiteRssSelector, configData.url, logs);
      logs.push(`[INFO] 提取完成，共找到 ${extractedContent.length} 个项目`);

      // 格式化日期
      const formattedContent = extractedContent.map(item => ({
        ...item,
        pubDate: formatDate(item.pubDate, (configData.selector as WebsiteRssSelector).dateFormat)
      }));

      const executionTime = Date.now() - startTime;
      logs.push(`[INFO] 调试完成，耗时: ${executionTime}ms`);

      return {
        success: true,
        data: {
          success: true,
          result: formattedContent,
          logs,
          executionTime,
          totalItems: formattedContent.length
        },
        message: "选择器调试成功"
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
          executionTime
        },
        message: "选择器调试失败"
      };
    }
  }

}