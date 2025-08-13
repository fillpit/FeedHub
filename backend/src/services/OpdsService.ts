import { injectable } from "inversify";
import axios, { AxiosInstance } from "axios";
import * as xml2js from "xml2js";
import OpdsConfig from "../models/OpdsConfig";
import GlobalSetting from "../models/GlobalSetting";
import {
  OpdsConfig as OpdsConfigInterface,
  OpdsParseResult,
  ApiResponse,
  PaginatedResponse,
  PaginationParams
} from "@feedhub/shared";

import { ApiResponseData } from "../utils/apiResponse";

@injectable()
export class OpdsService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'FeedHub OPDS Client/1.0',
      },
    });
  }

  /**
   * 创建OPDS配置
   */
  async createOpdsConfig(configData: Partial<OpdsConfigInterface>): Promise<ApiResponseData<OpdsConfigInterface>> {
    try {
      const config = await OpdsConfig.create({
        name: configData.name || '未命名OPDS源',
        url: configData.url!,
        username: configData.username,
        password: configData.password,
        authType: configData.authType || 'none',
        bearerToken: configData.bearerToken,
        enabled: configData.enabled ?? true,
        ...configData,
      });

      return {
        success: true,
        data: config,
        message: "OPDS配置创建成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `创建OPDS配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 获取所有OPDS配置
   */
  async getAllOpdsConfigs(params?: PaginationParams): Promise<ApiResponseData<PaginatedResponse<OpdsConfigInterface>>> {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params || {};
      const offset = (page - 1) * limit;

      const { count, rows } = await OpdsConfig.findAndCountAll({
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      return {
        success: true,
        data: {
          list: rows,
          total: count,
          page,
          pageSize: limit,
          hasMore: page * limit < count,
        },
        message: `成功获取${rows.length}个OPDS配置`,
      };
    } catch (error) {
      return {
        success: false,
        error: `获取OPDS配置列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 根据ID获取OPDS配置
   */
  async getOpdsConfigById(id: number): Promise<ApiResponseData<OpdsConfigInterface>> {
    try {
      const config = await OpdsConfig.findByPk(id);
      if (config) {
        return {
          success: true,
          data: config,
          message: "获取OPDS配置成功",
        };
      } else {
        return {
          success: false,
          error: `未找到ID为${id}的OPDS配置`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `获取OPDS配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 更新OPDS配置
   */
  async updateOpdsConfig(id: number, updateData: Partial<OpdsConfigInterface>): Promise<ApiResponseData<OpdsConfigInterface>> {
    try {
      const config = await OpdsConfig.findByPk(id);
      if (config) {
        await config.update(updateData);
        return {
          success: true,
          data: config,
          message: "OPDS配置更新成功",
        };
      } else {
        return {
          success: false,
          error: `未找到ID为${id}的OPDS配置`,
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `更新OPDS配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 删除OPDS配置
   */
  async deleteOpdsConfig(id: number): Promise<ApiResponseData<void>> {
    try {
      const config = await OpdsConfig.findByPk(id);
      if (config) {
        await config.destroy();
        return {
          success: true,
          message: "OPDS配置删除成功",
        };
      } else {
        return {
          success: false,
          error: `未找到ID为${id}的OPDS配置`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `删除OPDS配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 测试OPDS连接
   */
  async testOpdsConnection(configId: number): Promise<ApiResponseData<{ connected: boolean; message: string }>> {
    try {
      const config = await OpdsConfig.findByPk(configId);
      if (!config) {
        return {
          success: false,
          error: `未找到ID为${configId}的OPDS配置`,
        };
      }

      const axiosConfig = this.buildAxiosConfig(config);
      const response = await this.axiosInstance.get(config.url, axiosConfig);

      if (response.status === 200) {
        return {
          success: true,
          data: { connected: true, message: "连接成功" },
          message: "OPDS连接测试成功",
        };
      } else {
        return {
          success: false,
          error: `连接失败，状态码: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 从OPDS获取书籍列表
   */
  async fetchBooksFromOpds(configId: number, searchQuery?: string): Promise<ApiResponseData<OpdsParseResult>> {
    try {
      const config = await OpdsConfig.findByPk(configId);
      if (!config) {
        return {
          success: false,
          error: "OPDS配置不存在或已禁用",
        };
      }

      const axiosConfig = this.buildAxiosConfig(config);
      let url = config.url;
      
      // 如果有搜索查询，构建搜索URL
      if (searchQuery) {
        url = this.buildSearchUrl(config.url, searchQuery);
      }

      const response = await this.axiosInstance.get(url, axiosConfig);
      const parseResult = await this.parseOpdsResponse(response.data);

      return {
        success: true,
        data: parseResult,
        message: `成功获取${parseResult.books.length}本书籍`,
      };
    } catch (error) {
      return {
        success: false,
        error: `获取OPDS书籍失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 使用全局设置从OPDS获取书籍
   */
  async fetchBooksFromGlobalOpds(searchQuery?: string): Promise<ApiResponseData<OpdsParseResult>> {
    try {
      const globalSetting = await GlobalSetting.findOne();
      if (!globalSetting || !globalSetting.opdsEnabled) {
        return {
          success: false,
          error: "全局OPDS服务未启用",
        };
      }

      if (!globalSetting.opdsServerUrl) {
        return {
          success: false,
          error: "全局OPDS服务器URL未配置",
        };
      }

      // 构建临时配置对象
      const tempConfig: OpdsConfigInterface = {
        id: 0,
        name: 'Global OPDS',
        url: globalSetting.opdsServerUrl,
        username: globalSetting.opdsUsername,
        password: globalSetting.opdsPassword,
        authType: globalSetting.opdsUsername ? 'basic' : 'none',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const axiosConfig = this.buildAxiosConfig(tempConfig);
      let url = tempConfig.url;
      
      // 如果有搜索查询，构建搜索URL
      if (searchQuery) {
        url = this.buildSearchUrl(tempConfig.url, searchQuery);
      }

      const response = await this.axiosInstance.get(url, axiosConfig);
      const parseResult = await this.parseOpdsResponse(response.data);

      return {
        success: true,
        data: parseResult,
        message: `成功获取${parseResult.books.length}本书籍`,
      };
    } catch (error) {
      return {
        success: false,
        error: `获取全局OPDS书籍失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 构建axios配置
   */
  private buildAxiosConfig(config: OpdsConfigInterface): any {
    const axiosConfig: any = {};

    if (config.authType === 'basic' && config.username && config.password) {
      axiosConfig.auth = {
        username: config.username,
        password: config.password,
      };
    } else if (config.authType === 'bearer' && config.bearerToken) {
      axiosConfig.headers = {
        'Authorization': `Bearer ${config.bearerToken}`,
      };
    }

    return axiosConfig;
  }

  /**
   * 构建搜索URL
   */
  private buildSearchUrl(baseUrl: string, searchQuery: string): string {
    // 如果搜索查询是特定的分类路径，直接构建对应的URL
    if (searchQuery === 'recent') {
      const url = new URL(baseUrl);
      if (url.pathname.endsWith('/opds')) {
        url.pathname = url.pathname + '/new';
      } else if (url.pathname.endsWith('/')) {
        url.pathname = url.pathname + 'new';
      } else {
        url.pathname = url.pathname + '/new';
      }
      return url.toString();
    }
    
    if (searchQuery === 'hot') {
      const url = new URL(baseUrl);
      if (url.pathname.endsWith('/opds')) {
        url.pathname = url.pathname + '/hot';
      } else if (url.pathname.endsWith('/')) {
        url.pathname = url.pathname + 'hot';
      } else {
        url.pathname = url.pathname + '/hot';
      }
      return url.toString();
    }
    
    const url = new URL(baseUrl);
    url.searchParams.set('q', searchQuery);
    return url.toString();
  }

  /**
   * 解析OPDS响应
   */
  private async parseOpdsResponse(xmlData: string): Promise<OpdsParseResult> {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);

    const feed = result.feed;
    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry].filter(Boolean);

    const books = entries.map((entry: any) => ({
      title: entry.title || '未知标题',
      author: this.extractAuthor(entry),
      description: this.extractDescription(entry),
      sourceType: 'opds' as const,
      sourceUrl: this.extractDownloadLink(entry),
      language: entry['dc:language'] || 'zh',
      categories: Array.isArray(entry.category) 
        ? entry.category.map((cat: any) => cat.$.term || cat.$.label)
        : entry.category ? [entry.category.$.term || entry.category.$.label] : [],
      fileFormat: this.extractFileFormat(entry),
      totalChapters: 1, // OPDS通常是完整书籍
      updateFrequency: 0, // OPDS书籍通常不需要更新
      isActive: true,
    }));

    return {
      books,
      totalCount: books.length,
      nextPageUrl: this.extractNextPageUrl(feed),
    };
  }

  /**
   * 提取作者信息
   */
  private extractAuthor(entry: any): string {
    if (entry.author) {
      if (Array.isArray(entry.author)) {
        return entry.author.map((author: any) => author.name || author).join(', ');
      } else {
        return entry.author.name || entry.author;
      }
    }
    return '未知作者';
  }

  /**
   * 提取描述信息
   */
  private extractDescription(entry: any): string | undefined {
    if (entry.summary) {
      return typeof entry.summary === 'string' ? entry.summary : entry.summary._;
    }
    if (entry.content) {
      return typeof entry.content === 'string' ? entry.content : entry.content._;
    }
    return undefined;
  }

  /**
   * 提取下载链接
   */
  private extractDownloadLink(entry: any): string {
    if (entry.link) {
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      const downloadLink = links.find((link: any) => 
        link.$.type && (link.$.type.includes('epub') || link.$.type.includes('pdf'))
      );
      if (downloadLink) {
        return downloadLink.$.href;
      }
      // 如果没有找到下载链接，返回第一个链接
      return links[0]?.$.href || '#';
    }
    return '#';
  }

  /**
   * 提取文件格式
   */
  private extractFileFormat(entry: any): string {
    const downloadLink = this.extractDownloadLink(entry);
    if (downloadLink.includes('.epub')) return 'epub';
    if (downloadLink.includes('.pdf')) return 'pdf';
    if (downloadLink.includes('.txt')) return 'txt';
    return 'unknown';
  }

  private extractNextPageUrl(feed: any): string | undefined {
    if (feed.link) {
      const links = Array.isArray(feed.link) ? feed.link : [feed.link];
      const nextLink = links.find((link: any) => link.$.rel === 'next');
      return nextLink?.$.href;
    }
    return undefined;
  }
}