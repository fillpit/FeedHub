import { injectable } from "inversify";
import WebsiteRssConfig, { WebsiteRssConfigAttributes, WebsiteRssSelector } from "../models/WebsiteRssConfig";
import axios from "axios";
import { AxiosInstance } from "axios";
import GlobalSetting from "../models/GlobalSetting";
import { ApiResponseData } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import * as cheerio from "cheerio";
import RSS from "rss";
import { v4 as uuidv4 } from "uuid";
import * as xpath from "xpath";
import { DOMParser } from "xmldom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import customParseFormat from "dayjs/plugin/customParseFormat";
import zhCN from "dayjs/locale/zh-cn";
import * as vm from "vm"; // 使用 Node.js 内置的 vm 模块
import * as util from 'util';
// 工具函数导入
import { extractContentFromHtml } from "../utils/htmlExtractor";
import { formatDate } from "../utils/dateUtils";
import { createRequestConfig } from "../utils/requestUtils";
import { createScriptContext, executeScript, validateScriptResult } from "../utils/scriptRunner";
import { getFavicon } from "../utils/favicon";
import { validateselector } from "../utils/selectorValidator";
import AuthCredential from "../models/AuthCredential";

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);
dayjs.locale(zhCN); // 设置为中文

@injectable()
export class WebsiteRssService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<ApiResponseData<WebsiteRssConfigAttributes[]>> {
    // 直接数据库查询
    const configs = await WebsiteRssConfig.findAll();
    return { data: configs };
  }

  /**
   * 根据ID获取配置
   */
  async getConfigById(id: number): Promise<ApiResponseData<WebsiteRssConfigAttributes>> {
    // 直接数据库查询
    const config = await WebsiteRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的网站RSS配置`);
    return { data: config };
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
    return { data: updatedConfig!, message: "网站RSS配置添加成功" };
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
    return { data: updatedConfig!, message: "网站RSS配置更新成功" };
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
    return { message: "网站RSS配置删除成功" };
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
    return { data: updatedConfig!, message: "网站RSS内容刷新成功" };
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
    if (config.fetchMode === "script") {
      // 脚本抓取模式
      extractedContent = await this.extractContentWithScript(config, requestConfig);
    } else {
      // 选择器抓取模式（默认）
      const response = await this.axiosInstance.get(config.url, requestConfig);
      const html = response.data;
      // 提取内容并格式化日期
      extractedContent = extractContentFromHtml(html, config.selector as WebsiteRssSelector, config.url)
        .map(item => ({
          ...item,
          pubDate: formatDate(item.pubDate, (config.selector as WebsiteRssSelector).dateFormat)
        }));
    }
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
      generator: 'CloudSaver WebsiteRSS',
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
   * 使用脚本抓取内容
   */
  private async extractContentWithScript(config: WebsiteRssConfigAttributes, requestConfig: any): Promise<any[]> {
    // 校验脚本
    if (!config.script || !config.script.enabled || !config.script.script) {
      throw new Error("脚本抓取未启用或脚本内容为空");
    }
    // 创建脚本上下文并执行
    const context = createScriptContext(config, this.axiosInstance, requestConfig);
    const result = await executeScript(config, context, this.axiosInstance);
    // 校验结果
    return validateScriptResult(result);
  }

  /**
   * 脚本调试
   */
  public async debugScript(config: WebsiteRssConfigAttributes): Promise<ApiResponseData<any>> {
    const startTime = Date.now();
    const logs: string[] = [];
    try {
      // 校验脚本
      if (!config.script || !config.script.enabled || !config.script.script) {
        throw new Error("脚本未启用或脚本内容为空");
      }
      // 新增：如有authCredentialId，查库组装
      let auth = config.auth || { enabled: false, authType: "none" };
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
      // 创建脚本上下文并执行
      const requestConfig = createRequestConfig(auth);
      const context = createScriptContext(config, this.axiosInstance, requestConfig, logs);
      const result = await executeScript(config, context, this.axiosInstance, logs);
      const executionTime = Date.now() - startTime;
      logs.push(`[INFO] 脚本执行成功，耗时 ${executionTime}ms`);
      return {
        data: {
          success: true,
          logs,
          result,
          executionTime,
        },
        message: "脚本调试成功"
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logs.push(`[FATAL] 脚本执行失败: ${(error as Error).message}`);
      return {
        data: {
          success: false,
          logs,
          error: (error as Error).message,
          stack: (error as Error).stack,
          executionTime,
        },
        message: "脚本调试失败"
      };
    }
  }
}