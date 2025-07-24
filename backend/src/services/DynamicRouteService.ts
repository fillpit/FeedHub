import { injectable, inject } from "inversify";
import DynamicRouteConfig, { DynamicRouteConfigAttributes, RouteParam } from "../models/DynamicRouteConfig";
import { ApiResponseData } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { executeScript, createScriptContext, validateScriptResult } from "../utils/scriptRunner";
import RSS from "rss";
import { v4 as uuidv4 } from "uuid";
import { TYPES } from "../core/types";
import { NpmPackageService } from "./NpmPackageService";
import AuthCredentialService from "./AuthCredentialService";
import { AuthCredentialAttributes } from "../models/AuthCredential";

@injectable()
export class DynamicRouteService {
  private axiosInstance = axios.create({
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  constructor(
    @inject(TYPES.NpmPackageService) private npmPackageService: NpmPackageService
  ) {}

  /**
   * 获取所有动态路由配置
   */
  async getAllRoutes(): Promise<ApiResponseData<DynamicRouteConfigAttributes[]>> {
    const routes = await DynamicRouteConfig.findAll();
    return { success: true, data: routes, message: "获取动态路由列表成功" };
  }

  /**
   * 根据ID获取动态路由配置
   */
  async getRouteById(id: number): Promise<ApiResponseData<DynamicRouteConfigAttributes>> {
    const route = await DynamicRouteConfig.findByPk(id);
    if (!route) throw new Error(`未找到ID为${id}的动态路由配置`);
    return { success: true, data: route, message: "获取动态路由成功" };
  }

  /**
   * 根据路径获取动态路由配置
   */
  async getRouteByPath(path: string): Promise<DynamicRouteConfigAttributes | null> {
    return await DynamicRouteConfig.findOne({ where: { path } });
  }

  /**
   * 根据路径模式匹配获取动态路由配置
   */
  async getRouteByPathPattern(requestPath: string): Promise<{ route: DynamicRouteConfigAttributes; pathParams: Record<string, string> } | null> {
    // 先尝试精确匹配
    const exactMatch = await this.getRouteByPath(requestPath);
    if (exactMatch) {
      return { route: exactMatch, pathParams: {} };
    }

    // 获取所有路由配置进行模式匹配
    const allRoutes = await DynamicRouteConfig.findAll();
    
    for (const route of allRoutes) {
      const matchResult = this.matchRoutePattern(route.path, requestPath);
      if (matchResult) {
        return { route, pathParams: matchResult };
      }
    }

    return null;
  }

  /**
   * 匹配路由模式并提取路径参数
   */
  private matchRoutePattern(pattern: string, path: string): Record<string, string> | null {
    // 将路由模式转换为正则表达式
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (match, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);

    if (!match) {
      return null;
    }

    // 提取参数值
    const pathParams: Record<string, string> = {};
    for (let i = 0; i < paramNames.length; i++) {
      pathParams[paramNames[i]] = match[i + 1];
    }

    return pathParams;
  }

  /**
   * 添加新的动态路由配置
   */
  async addRoute(routeData: Omit<DynamicRouteConfigAttributes, "id" | "createdAt" | "updatedAt">): Promise<ApiResponseData<DynamicRouteConfigAttributes>> {
    // 检查路径是否已存在
    const existingRoute = await DynamicRouteConfig.findOne({ where: { path: routeData.path } });
    if (existingRoute) throw new Error("该路由路径已存在");

    // 验证脚本配置
    this.validateScriptConfig(routeData.script);

    // 创建新配置
    const newRoute = await DynamicRouteConfig.create(routeData);
    return { success: true, data: newRoute, message: "动态路由配置添加成功" };
  }

  /**
   * 更新动态路由配置
   */
  async updateRoute(id: number, routeData: Partial<DynamicRouteConfigAttributes>): Promise<ApiResponseData<DynamicRouteConfigAttributes>> {
    // 查找原配置
    const route = await DynamicRouteConfig.findByPk(id);
    if (!route) throw new Error(`未找到ID为${id}的动态路由配置`);

    // 如果更新了路径，检查是否与其他路由冲突
    if (routeData.path && routeData.path !== route.path) {
      const existingRoute = await DynamicRouteConfig.findOne({ where: { path: routeData.path } });
      if (existingRoute && existingRoute.id !== id) throw new Error("该路由路径已存在");
    }

    // 如果更新了脚本配置，验证脚本配置
    if (routeData.script) {
      this.validateScriptConfig(routeData.script);
    }

    // 更新数据库
    await DynamicRouteConfig.update(routeData, { where: { id } });

    // 返回最新配置
    const updatedRoute = await DynamicRouteConfig.findByPk(id);
    return { success: true, data: updatedRoute!, message: "动态路由配置更新成功" };
  }

  /**
   * 删除动态路由配置
   */
  async deleteRoute(id: number): Promise<ApiResponseData<void>> {
    // 查找原配置
    const route = await DynamicRouteConfig.findByPk(id);
    if (!route) throw new Error(`未找到ID为${id}的动态路由配置`);

    // 删除
    await DynamicRouteConfig.destroy({ where: { id } });
    return { success: true, data: undefined, message: "动态路由配置删除成功" };
  }

  /**
   * 执行动态路由脚本并返回RSS
   */
  async executeRouteScript(routePath: string, queryParams: any): Promise<string> {
    logger.info(`[DynamicRouteService] 开始执行动态路由脚本`);
    logger.info(`[DynamicRouteService] 请求路径: ${routePath}`);
    logger.info(`[DynamicRouteService] 查询参数:`, queryParams);
    
    // 尝试不同的路径格式进行模式匹配
    const pathsToTry = [
      routePath,
      `/${routePath}`,
      `/custom/${routePath}`
    ];
    
    let matchResult: { route: DynamicRouteConfigAttributes; pathParams: Record<string, string> } | null = null;
    
    for (const pathToTry of pathsToTry) {
      logger.info(`[DynamicRouteService] 尝试匹配路径: ${pathToTry}`);
      matchResult = await this.getRouteByPathPattern(pathToTry);
      if (matchResult) {
        logger.info(`[DynamicRouteService] 路径匹配成功: ${pathToTry}`);
        logger.info(`[DynamicRouteService] 提取的路径参数:`, matchResult.pathParams);
        break;
      }
    }
    
    if (!matchResult) {
      // 记录调试信息
      logger.warn(`路径查找失败: ${routePath}`);
      const allRoutes = await DynamicRouteConfig.findAll({ attributes: ['path'] });
      logger.warn(`现有路径: ${allRoutes.map(r => r.path).join(', ')}`);
      throw new Error(`未找到路径为${routePath}的动态路由配置`);
    }

    const { route, pathParams } = matchResult;

    // 合并路径参数和查询参数，路径参数优先级更高
    const mergedParams = { ...queryParams, ...pathParams };
    logger.info(`[DynamicRouteService] 合并后的参数:`, mergedParams);

    // 验证并处理参数
    const processedParams = this.processRouteParams(route.params, mergedParams);

    // 获取授权信息
    let authInfo: AuthCredentialAttributes | null = null;
    if (route.authCredentialId) {
      try {
        const authResult = await AuthCredentialService.getById(route.authCredentialId);
        if (authResult.success && authResult.data) {
          authInfo = authResult.data;
          logger.info(`[DynamicRouteService] 获取到授权信息: ${authInfo.name} (${authInfo.authType})`);
        } else {
          logger.warn(`[DynamicRouteService] 未找到授权信息，ID: ${route.authCredentialId}`);
        }
      } catch (error) {
        logger.error(`[DynamicRouteService] 获取授权信息失败:`, error);
      }
    }

    // 获取脚本内容
    const scriptContent = await this.getScriptContent(route.script);

    // 创建脚本上下文并执行
    const context = createScriptContext(
      { url: "", script: { enabled: true, script: scriptContent }, auth: authInfo },
      this.axiosInstance,
      {}
    );

    // 添加路由参数到上下文
    (context as any).routeParams = processedParams;

    // 执行脚本
    const result = await executeScript(
      { script: { enabled: true, script: scriptContent, timeout: route.script.timeout || 30000 } },
      context,
      this.axiosInstance,
      undefined,
      this.npmPackageService
    );

    // 验证结果
    const validatedResult = validateScriptResult(result);

    // 生成RSS
    return this.generateRssXml(route, validatedResult);
  }

  /**
   * 调试动态路由脚本
   */
  async debugRouteScript(routeData: DynamicRouteConfigAttributes, testParams: any): Promise<ApiResponseData<any>> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // 验证脚本配置
      console.log("开始验证脚本配置");
      this.validateScriptConfig(routeData.script);
      console.log("脚本配置验证通过");

      // 验证并处理参数
      console.log("开始处理路由参数");
      const processedParams = this.processRouteParams(routeData.params, testParams);
      console.log("路由参数处理完成");

      // 获取授权信息
      let authInfo: AuthCredentialAttributes | null = null;
      if (routeData.authCredentialId) {
        try {
          const authResult = await AuthCredentialService.getById(routeData.authCredentialId);
          if (authResult.success && authResult.data) {
            authInfo = authResult.data;
            logs.push(`[DEBUG] 获取到授权信息: ${authInfo.name} (${authInfo.authType})`);
          } else {
            logs.push(`[WARN] 未找到授权信息，ID: ${routeData.authCredentialId}`);
          }
        } catch (error) {
          logs.push(`[ERROR] 获取授权信息失败: ${(error as Error).message}`);
        }
      }

      // 获取脚本内容
      console.log("开始获取脚本内容");
      const scriptContent = await this.getScriptContent(routeData.script);
      console.log("脚本内容获取完成");

      // 创建脚本上下文并执行
      const context = createScriptContext(
        { url: "", script: { enabled: true, script: scriptContent }, auth: authInfo },
        this.axiosInstance,
        {},
        logs
      );

      // 添加路由参数到上下文
      (context as any).routeParams = processedParams;
      
      // 添加调试信息
      logs.push(`[DEBUG] 路由参数: ${JSON.stringify(processedParams, null, 2)}`);
      logs.push(`[DEBUG] 脚本内容长度: ${scriptContent.length} 字符`);
      logs.push(`[DEBUG] 脚本来源类型: ${routeData.script.sourceType}`);
      
      // 添加常用的辅助函数到上下文
      (context as any).helpers = {
        // 提供guid生成函数，防止用户脚本中访问undefined的uid属性
        generateGuid: () => require('uuid').v4(),
        // 安全访问对象属性
        safeGet: (obj: any, path: string, defaultValue: any = null) => {
          try {
            const keys = path.split('.');
            let current = obj;
            for (const key of keys) {
              if (current && typeof current === 'object' && key in current) {
                current = current[key];
              } else {
                return defaultValue;
              }
            }
            return current !== undefined ? current : defaultValue;
          } catch (error) {
            logs.push(`[WARN] 安全访问失败: ${path}, 错误: ${(error as Error).message}`);
            return defaultValue;
          }
        }
      };

      // 执行脚本
      const result = await executeScript(
        { script: { enabled: true, script: scriptContent, timeout: routeData.script.timeout || 30000 } },
        context,
        this.axiosInstance,
        logs,
        this.npmPackageService
      );

      // 验证结果
      const validatedResult = validateScriptResult(result);

      const executionTime = Date.now() - startTime;
      logs.push(`[INFO] 脚本执行成功，耗时 ${executionTime}ms`);

      return {
        success: true,
        data: {
          success: true,
          logs,
          result: validatedResult,
          executionTime,
        },
        message: "脚本调试成功"
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logs.push(`[FATAL] 脚本执行失败: ${(error as Error).message}`);

      return {
        success: false,
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

  /**
   * 验证脚本配置
   */
  private validateScriptConfig(scriptConfig: any): void {
    if (!scriptConfig) throw new Error("脚本配置不能为空");
    if (!scriptConfig.sourceType) throw new Error("脚本来源类型不能为空");
    if (!scriptConfig.content) throw new Error("脚本内容不能为空");

    if (scriptConfig.sourceType === "url" && !this.isValidUrl(scriptConfig.content)) {
      throw new Error("无效的脚本URL");
    }
  }

  /**
   * 验证URL是否有效
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 处理路由参数
   */
  private processRouteParams(paramConfig: RouteParam[], queryParams: any): any {
    const result: any = {};

    // 处理每个参数
    console.log("开始处理路由参数", paramConfig, queryParams);
    for (const param of paramConfig) {
      let value = queryParams[param.name];
      console.log(`参数 ${param.name} 原始值: ${value}`);

      // 如果参数未提供但有默认值，使用默认值
      console.log(`参数 ${param.name} 未提供，检查默认值`);
      if (value === undefined && param.default !== undefined) {
        value = param.default;
      }

      // 如果参数是必需的但未提供，抛出错误
      console.log(`参数 ${param.name} 检查是否必需`);
      if (param.required && value === undefined) {
        console.log(`参数 ${param.name} 未提供，是必需参数`);
        throw new Error(`缺少必需参数: ${param.name}`);
      }

      // 如果参数已提供，进行类型转换
      console.log(`参数 ${param.name} 检查类型`);
      if (value !== undefined) {
        switch (param.type) {
          case "number":
            value = Number(value);
            if (isNaN(value)) throw new Error(`参数 ${param.name} 必须是数字`);
            break;
          case "boolean":
            if (typeof value === "string") {
              value = value.toLowerCase() === "true";
            } else {
              value = Boolean(value);
            }
            break;
          case "string":
            value = String(value);
            break;
        }

        result[param.name] = value;
      }
    }

    return result;
  }

  /**
   * 获取脚本内容
   */
  private async getScriptContent(scriptConfig: any): Promise<string> {
    switch (scriptConfig.sourceType) {
      case "inline":
        return scriptConfig.content;
      case "url":
        try {
          const response = await this.axiosInstance.get(scriptConfig.content);
          return response.data;
        } catch (error) {
          throw new Error(`无法从URL获取脚本: ${(error as Error).message}`);
        }
      case "file":
        // 这里假设content存储的是文件路径
        try {
          const filePath = path.resolve(process.cwd(), "uploads", scriptConfig.content);
          return fs.readFileSync(filePath, "utf-8");
        } catch (error) {
          throw new Error(`无法读取脚本文件: ${(error as Error).message}`);
        }
      default:
        throw new Error(`不支持的脚本来源类型: ${scriptConfig.sourceType}`);
    }
  }

  /**
   * 生成RSS XML
   */
  private generateRssXml(route: DynamicRouteConfigAttributes, scriptResult: any): string {
    // 如果脚本返回的是旧格式（只有items），使用路由配置作为RSS字段
    if (scriptResult.items && !scriptResult.title) {
      const feed = new RSS({
        title: route.name,
        description: route.description || route.name,
        feed_url: `${process.env.API_BASE_URL || ''}/api/dynamic-route${route.path}`,
        site_url: `${process.env.API_BASE_URL || ''}/api/dynamic-route${route.path}`,
        generator: 'FeedHub DynamicRoute',
        pubDate: new Date(),
      });

      // 添加项目
      scriptResult.items.forEach((item: any) => {
        const itemOptions: any = {
          title: item.title,
          description: item.content || item.contentSnippet || '',
          url: item.link,
          guid: item.guid || item.link || uuidv4(),
          date: item.pubDate,
          author: item.author,
        };
        
        // 添加封面图片作为enclosure（如果存在）
        if (item.image) {
          itemOptions.enclosure = {
            url: item.image,
            type: 'image/jpeg' // 默认类型，实际应用中可根据图片URL后缀判断
          };
        }
        
        feed.item(itemOptions);
      });

      return feed.xml({ indent: true });
    }

    // 如果脚本返回的是新格式（包含完整RSS字段），使用脚本提供的字段
    const feedOptions: any = {
      title: scriptResult.title || route.name,
      description: scriptResult.description || route.description || route.name,
      feed_url: scriptResult.feed_url || `${process.env.API_BASE_URL || ''}/api/dynamic-route${route.path}`,
      site_url: scriptResult.site_url || `${process.env.API_BASE_URL || ''}/api/dynamic-route${route.path}`,
      generator: scriptResult.generator || 'FeedHub DynamicRoute',
      pubDate: scriptResult.pubDate ? new Date(scriptResult.pubDate) : new Date(),
    };

    // 添加可选字段
    if (scriptResult.language) feedOptions.language = scriptResult.language;
    if (scriptResult.copyright) feedOptions.copyright = scriptResult.copyright;
    if (scriptResult.managingEditor) feedOptions.managingEditor = scriptResult.managingEditor;
    if (scriptResult.webMaster) feedOptions.webMaster = scriptResult.webMaster;
    if (scriptResult.ttl) feedOptions.ttl = scriptResult.ttl;
    if (scriptResult.image) feedOptions.image_url = scriptResult.image;

    const feed = new RSS(feedOptions);

    // 添加项目
    scriptResult.items.forEach((item: any) => {
      const itemOptions: any = {
        title: item.title,
        description: item.content || item.contentSnippet || '',
        url: item.link,
        guid: item.guid || item.link || uuidv4(),
        date: item.pubDate,
        author: item.author,
      };
      
      // 添加封面图片作为enclosure（如果存在）
      if (item.image) {
        itemOptions.enclosure = {
          url: item.image,
          type: 'image/jpeg' // 默认类型，实际应用中可根据图片URL后缀判断
        };
      }
      
      feed.item(itemOptions);
    });

    return feed.xml({ indent: true });
  }
}