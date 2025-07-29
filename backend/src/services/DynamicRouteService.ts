import { injectable, inject } from "inversify";
import DynamicRouteConfig, {
  DynamicRouteConfigAttributes,
  RouteParam,
} from "../models/DynamicRouteConfig";
import { ApiResponseData } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { executeScript, createScriptContext, validateScriptResult } from "../utils/scriptRunner";
import RSS from "rss";
import { v4 as uuidv4 } from "uuid";
import { TYPES } from "../core/types";
import { NpmPackageService } from "./NpmPackageService";
import AuthCredentialService from "./AuthCredentialService";
import { AuthCredentialAttributes } from "../models/AuthCredential";
import { ICacheService, getCacheService } from "./cache";
import AdmZip from "adm-zip";
import { ScriptPackageService } from "./ScriptPackageService";
import { ScriptFileService } from "./ScriptFileService";

@injectable()
export class DynamicRouteService {
  private axiosInstance = axios.create({
    timeout: 30000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  private cacheService: ICacheService | null = null;

  constructor(
    @inject(TYPES.NpmPackageService) private npmPackageService: NpmPackageService,
    @inject(TYPES.ScriptPackageService) private scriptPackageService: ScriptPackageService,
    @inject(TYPES.ScriptFileService) private scriptFileService: ScriptFileService
  ) {
    this.initializeCacheService();
  }

  /**
   * 初始化缓存服务
   */
  private async initializeCacheService(): Promise<void> {
    try {
      this.cacheService = await getCacheService();
      logger.info("[DynamicRouteService] 缓存服务初始化成功");
    } catch (error) {
      logger.error("[DynamicRouteService] 缓存服务初始化失败:", error);
    }
  }

  /**
   * 确保缓存服务已初始化
   */
  private async ensureCacheService(): Promise<ICacheService> {
    if (!this.cacheService) {
      this.cacheService = await getCacheService();
    }
    return this.cacheService;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(routePath: string, queryParams: any): string {
    const paramsStr = JSON.stringify(queryParams, Object.keys(queryParams).sort());
    return `route:${routePath}:${Buffer.from(paramsStr).toString("base64")}`;
  }

  /**
   * 获取缓存
   */
  private async getCache(key: string): Promise<string | null> {
    try {
      const cacheService = await this.ensureCacheService();
      const result = await cacheService.get(key);
      if (result) {
        logger.info(`[DynamicRouteService] 缓存命中: ${key}`);
      }
      return result;
    } catch (error) {
      logger.error("[DynamicRouteService] 获取缓存失败:", error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  private async setCache(key: string, data: string, ttlMinutes: number): Promise<void> {
    try {
      const cacheService = await this.ensureCacheService();
      await cacheService.set(key, data, ttlMinutes * 60); // 转换为秒
      logger.info(`[DynamicRouteService] 缓存设置: ${key}, TTL: ${ttlMinutes}分钟`);
    } catch (error) {
      logger.error("[DynamicRouteService] 设置缓存失败:", error);
    }
  }

  /**
   * 清除特定路由的所有缓存
   */
  private async clearRouteCache(routePath: string): Promise<void> {
    try {
      const cacheService = await this.ensureCacheService();
      const pattern = `route:${routePath}:*`;
      await cacheService.deletePattern(pattern);
      logger.info(`[DynamicRouteService] 清除路由缓存: ${routePath}`);
    } catch (error) {
      logger.error("[DynamicRouteService] 清除路由缓存失败:", error);
    }
  }

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
  async getRouteByPathPattern(
    requestPath: string
  ): Promise<{ route: DynamicRouteConfigAttributes; pathParams: Record<string, string> } | null> {
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
      return "([^/]+)";
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
  async addRoute(
    routeData: Omit<DynamicRouteConfigAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<ApiResponseData<DynamicRouteConfigAttributes>> {
    // 检查路径是否已存在
    const existingRoute = await DynamicRouteConfig.findOne({ where: { path: routeData.path } });
    if (existingRoute) throw new Error("该路由路径已存在");

    // 验证脚本配置
    console.log("开始验证脚本配置");
    this.validateScriptConfig(routeData.script);
    console.log("验证脚本配置通过");

    // 处理内联脚本：创建脚本目录并保存到文件系统
    if (routeData.script.sourceType === 'inline') {
      try {
        // 创建脚本目录
        const scriptDirName = await this.scriptFileService.createRouteScriptDirectory(routeData.name);
        
        // 如果用户提供了自定义脚本内容，覆盖默认的main.js
        if (routeData.script.content && routeData.script.content.trim()) {
          await this.scriptFileService.writeScriptFile(scriptDirName, 'main.js', routeData.script.content);
        }
        
        // 更新脚本配置，将content改为脚本目录名称
        routeData.script.content = scriptDirName;
        
        logger.info(`[DynamicRouteService] 为内联脚本路由 "${routeData.name}" 创建脚本目录: ${scriptDirName}`);
      } catch (error) {
        logger.error(`[DynamicRouteService] 创建脚本目录失败:`, error);
        throw new Error(`创建脚本目录失败: ${(error as Error).message}`);
      }
    }

    // 创建新配置
    const newRoute = await DynamicRouteConfig.create(routeData);
    console.log("newRoute", newRoute);
    return { success: true, data: newRoute, message: "动态路由配置添加成功" };
  }

  /**
   * 更新动态路由配置
   */
  async updateRoute(
    id: number,
    routeData: Partial<DynamicRouteConfigAttributes>
  ): Promise<ApiResponseData<DynamicRouteConfigAttributes>> {
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
      
      // 处理内联脚本更新
      if (routeData.script.sourceType === 'inline') {
        try {
          // 如果原来也是内联脚本，更新现有脚本目录
          if (route.script.sourceType === 'inline' && route.script.content) {
            // 检查脚本目录是否存在
            if (this.scriptFileService.scriptDirectoryExists(route.script.content)) {
              // 更新脚本内容
              if (routeData.script.content && routeData.script.content.trim()) {
                await this.scriptFileService.writeScriptFile(route.script.content, 'main.js', routeData.script.content);
              }
              // 保持原有的脚本目录名称
              routeData.script.content = route.script.content;
            } else {
              // 原脚本目录不存在，创建新的
              const scriptDirName = await this.scriptFileService.createRouteScriptDirectory(routeData.name || route.name);
              if (routeData.script.content && routeData.script.content.trim()) {
                await this.scriptFileService.writeScriptFile(scriptDirName, 'main.js', routeData.script.content);
              }
              routeData.script.content = scriptDirName;
            }
          } else {
            // 从其他类型转换为内联脚本，创建新的脚本目录
            const scriptDirName = await this.scriptFileService.createRouteScriptDirectory(routeData.name || route.name);
            if (routeData.script.content && routeData.script.content.trim()) {
              await this.scriptFileService.writeScriptFile(scriptDirName, 'main.js', routeData.script.content);
            }
            routeData.script.content = scriptDirName;
          }
          
          logger.info(`[DynamicRouteService] 更新内联脚本路由 "${route.name}" 的脚本内容`);
        } catch (error) {
          logger.error(`[DynamicRouteService] 更新脚本内容失败:`, error);
          throw new Error(`更新脚本内容失败: ${(error as Error).message}`);
        }
      } else if (route.script.sourceType === 'inline' && route.script.content) {
        // 从内联脚本转换为其他类型，可以选择保留或删除脚本目录
        // 这里选择保留，以防用户误操作
        logger.info(`[DynamicRouteService] 路由 "${route.name}" 从内联脚本转换为 ${routeData.script.sourceType}，保留原脚本目录: ${route.script.content}`);
      }
    }

    // 更新数据库
    await DynamicRouteConfig.update(routeData, { where: { id } });

    // 清除相关缓存
    await this.clearRouteCache(route.path);
    if (routeData.path && routeData.path !== route.path) {
      // 如果路径发生变化，也清除新路径的缓存
      await this.clearRouteCache(routeData.path);
    }

    // 返回最新配置
    const updatedRoute = await DynamicRouteConfig.findByPk(id);
    return { success: true, data: updatedRoute!, message: "动态路由配置更新成功" };
  }

  /**
   * 获取内联脚本的文件列表
   * @param routeId 路由ID
   * @returns 文件列表
   */
  async getInlineScriptFiles(routeId: number): Promise<ApiResponseData<string[]>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);
    
    if (route.script.sourceType !== 'inline') {
      throw new Error('该路由不是内联脚本类型');
    }
    
    try {
      const files = await this.scriptFileService.getScriptFiles(route.script.content);
      return { success: true, data: files, message: '获取文件列表成功' };
    } catch (error) {
      throw new Error(`获取文件列表失败: ${(error as Error).message}`);
    }
  }

  /**
   * 获取内联脚本的文件内容
   * @param routeId 路由ID
   * @param fileName 文件名
   * @returns 文件内容
   */
  async getInlineScriptFileContent(routeId: number, fileName: string): Promise<ApiResponseData<{ content: string }>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);
    
    if (route.script.sourceType !== 'inline') {
      throw new Error('该路由不是内联脚本类型');
    }
    
    try {
      const content = await this.scriptFileService.readScriptFile(route.script.content, fileName);
      return { success: true, data: { content }, message: '获取文件内容成功' };
    } catch (error) {
      throw new Error(`获取文件内容失败: ${(error as Error).message}`);
    }
  }

  /**
   * 更新内联脚本的文件内容
   * @param routeId 路由ID
   * @param fileName 文件名
   * @param content 文件内容
   */
  async updateInlineScriptFileContent(routeId: number, fileName: string, content: string): Promise<ApiResponseData<void>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);
    
    if (route.script.sourceType !== 'inline') {
      throw new Error('该路由不是内联脚本类型');
    }
    
    try {
      await this.scriptFileService.writeScriptFile(route.script.content, fileName, content);
      
      // 清除相关缓存
      await this.clearRouteCache(route.path);
      
      return { success: true, data: undefined, message: '更新文件内容成功' };
    } catch (error) {
      throw new Error(`更新文件内容失败: ${(error as Error).message}`);
    }
  }

  /**
   * 删除动态路由配置
   */
  async deleteRoute(id: number): Promise<ApiResponseData<void>> {
    // 查找原配置
    const route = await DynamicRouteConfig.findByPk(id);
    if (!route) throw new Error(`未找到ID为${id}的动态路由配置`);

    // 如果是内联脚本，删除对应的脚本目录
    if (route.script.sourceType === 'inline' && route.script.content) {
      try {
        await this.scriptFileService.deleteScriptDirectory(route.script.content);
        logger.info(`[DynamicRouteService] 删除内联脚本路由 "${route.name}" 的脚本目录: ${route.script.content}`);
      } catch (error) {
        logger.warn(`[DynamicRouteService] 删除脚本目录失败，但继续删除路由配置:`, error);
      }
    }

    // 清除相关缓存
    await this.clearRouteCache(route.path);

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

    // 生成缓存键
    const cacheKey = this.generateCacheKey(routePath, queryParams);

    // 尝试从缓存获取结果
    const cachedResult = await this.getCache(cacheKey);
    if (cachedResult) {
      logger.info(`[DynamicRouteService] 返回缓存结果`);
      return cachedResult;
    }

    // 尝试不同的路径格式进行模式匹配
    const pathsToTry = [routePath, `/${routePath}`, `/custom/${routePath}`];

    let matchResult: {
      route: DynamicRouteConfigAttributes;
      pathParams: Record<string, string>;
    } | null = null;

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
      const allRoutes = await DynamicRouteConfig.findAll({ attributes: ["path"] });
      logger.warn(`现有路径: ${allRoutes.map((r) => r.path).join(", ")}`);
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
          logger.info(
            `[DynamicRouteService] 获取到授权信息: ${authInfo.name} (${authInfo.authType})`
          );
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
    const rssXml = this.generateRssXml(route, validatedResult);

    // 将结果存入缓存，使用refreshInterval作为缓存时间
    const refreshInterval = route.refreshInterval || 60; // 默认60分钟
    await this.setCache(cacheKey, rssXml, refreshInterval);

    logger.info(`[DynamicRouteService] 脚本执行完成，结果已缓存 ${refreshInterval} 分钟`);

    return rssXml;
  }

  /**
   * 调试动态路由脚本
   */
  async debugRouteScript(
    routeData: DynamicRouteConfigAttributes,
    testParams: any
  ): Promise<ApiResponseData<any>> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // 验证脚本配置
      console.log("开始验证脚本配置");
      this.validateScriptConfig(routeData.script);
      console.log("脚本配置验证通过");

      // 验证并处理参数
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
      console.log("开始创建脚本上下文");
      const context = createScriptContext(
        { url: "", script: { enabled: true, script: scriptContent }, auth: authInfo },
        this.axiosInstance,
        logs
      );
      console.log("脚本上下文创建完成");

      // 添加路由参数到上下文
      (context as any).routeParams = processedParams;

      // 添加调试信息
      logs.push(`[DEBUG] 路由参数: ${JSON.stringify(processedParams, null, 2)}`);
      logs.push(`[DEBUG] 脚本内容长度: ${scriptContent.length} 字符`);
      logs.push(`[DEBUG] 脚本来源类型: ${routeData.script.sourceType}`);

      // 执行脚本
      const result = await executeScript(
        {
          script: {
            enabled: true,
            script: scriptContent,
            timeout: routeData.script.timeout || 30000,
          },
        },
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
        message: "脚本调试成功",
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
        message: "脚本调试失败",
      };
    }
  }

  /**
   * 使用编辑会话调试动态路由脚本
   */
  async debugRouteScriptWithEditSession(
    routeData: DynamicRouteConfigAttributes,
    testParams: any,
    editSessionId: string
  ): Promise<ApiResponseData<any>> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // 验证并处理参数
      const processedParams = this.processRouteParams(routeData.params, testParams);
      logs.push(`[DEBUG] 路由参数处理完成`);

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

      // 获取编辑会话的临时目录
      const tempDir = this.scriptPackageService.getEditSessionTempDir(editSessionId);
      logs.push(`[DEBUG] 使用编辑会话临时目录: ${tempDir}`);

      // 创建临时脚本配置，使用编辑会话的临时目录
      const tempScriptConfig = {
        ...routeData.script,
        sourceType: 'package' as const,
        content: tempDir // 直接使用临时目录路径
      };

      // 获取脚本内容（从编辑会话的临时目录）
      const scriptContent = await this.getScriptContentFromTempDir(tempDir);
      logs.push(`[DEBUG] 从编辑会话获取脚本内容，长度: ${scriptContent.length} 字符`);

      // 创建脚本上下文并执行
      const context = createScriptContext(
        { url: "", script: { enabled: true, script: scriptContent }, auth: authInfo },
        this.axiosInstance,
        logs
      );

      // 添加路由参数到上下文
      (context as any).routeParams = processedParams;

      // 添加调试信息
      logs.push(`[DEBUG] 路由参数: ${JSON.stringify(processedParams, null, 2)}`);
      logs.push(`[DEBUG] 编辑会话ID: ${editSessionId}`);

      // 执行脚本
      const result = await executeScript(
        {
          script: {
            enabled: true,
            script: scriptContent,
            timeout: routeData.script.timeout || 30000,
          },
        },
        context,
        this.axiosInstance,
        logs,
        this.npmPackageService
      );

      // 验证结果
      const validatedResult = validateScriptResult(result);

      const executionTime = Date.now() - startTime;
      logs.push(`[INFO] 编辑会话脚本执行成功，耗时 ${executionTime}ms`);

      return {
        success: true,
        data: {
          success: true,
          logs,
          result: validatedResult,
          executionTime,
          editSessionId,
        },
        message: "编辑会话脚本调试成功",
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logs.push(`[FATAL] 编辑会话脚本执行失败: ${(error as Error).message}`);

      return {
        success: false,
        data: {
          success: false,
          logs,
          error: (error as Error).message,
          stack: (error as Error).stack,
          executionTime,
          editSessionId,
        },
        message: "编辑会话脚本调试失败",
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
        try {
          // 从文件系统读取内联脚本内容
          const scriptDirName = scriptConfig.content;
          const scriptDir = this.scriptFileService.getScriptDirectoryPath(scriptDirName);
          
          // 读取package.json获取入口文件
          const packageJsonPath = path.join(scriptDir, 'package.json');
          if (!fs.existsSync(packageJsonPath)) {
            throw new Error('脚本目录必须包含package.json文件');
          }
          
          let packageInfo: any;
          try {
            const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
            packageInfo = JSON.parse(packageContent);
          } catch (error) {
            throw new Error('package.json格式错误');
          }
          
          const entryPoint = packageInfo.main || 'main.js';
          const entryFilePath = path.join(scriptDir, entryPoint);
          
          if (!fs.existsSync(entryFilePath)) {
            throw new Error(`入口文件不存在: ${entryPoint}`);
          }
          
          const entryScript = fs.readFileSync(entryFilePath, 'utf-8');
          
          // 创建包装脚本，支持require模块加载
          return this.createPackageWrapper(scriptDir, entryScript, entryPoint);
        } catch (error) {
          throw new Error(`无法读取内联脚本: ${(error as Error).message}`);
        }
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
      case "package":
        try {
          return await this.extractAndLoadPackageScript(scriptConfig);
        } catch (error) {
          throw new Error(`无法加载脚本包: ${(error as Error).message}`);
        }
      default:
        throw new Error(`不支持的脚本来源类型: ${scriptConfig.sourceType}`);
    }
  }

  /**
   * 解压并加载脚本包
   */
  private async extractAndLoadPackageScript(scriptConfig: any): Promise<string> {
    const zipFilePath = path.resolve(process.cwd(), "uploads", scriptConfig.content);
    
    // 创建临时目录
    const tempDir = path.join(os.tmpdir(), `script-package-${uuidv4()}`);
    
    try {
      // 解压zip文件
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(tempDir, true);
      
      // 读取package.json获取入口文件
      const packageJsonPath = path.join(tempDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('脚本包必须包含package.json文件');
      }
      
      let packageInfo: any;
      try {
        const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
        packageInfo = JSON.parse(packageContent);
      } catch (error) {
        throw new Error('package.json格式错误');
      }
      
      if (!packageInfo.main) {
        throw new Error('package.json中必须包含main字段指定入口文件');
      }
      
      const entryPoint = packageInfo.main;
      
      // 读取入口文件
      const entryFilePath = path.join(tempDir, entryPoint);
      if (!fs.existsSync(entryFilePath)) {
        throw new Error(`入口文件不存在: ${entryPoint}`);
      }
      
      // 创建包装脚本，支持require模块加载
      const entryScript = fs.readFileSync(entryFilePath, "utf-8");
      const packageScript = this.createPackageWrapper(tempDir, entryScript, entryPoint);
      
      return packageScript;
    } finally {
      // 清理临时目录（延迟清理，确保脚本执行完成）
      setTimeout(() => {
        try {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        } catch (error) {
          logger.warn(`清理临时目录失败: ${tempDir}`, error);
        }
      }, 60000); // 1分钟后清理
    }
  }

  /**
   * 从临时目录获取脚本内容（用于编辑会话调试）
   */
  private async getScriptContentFromTempDir(tempDir: string): Promise<string> {
    // 读取package.json获取入口文件
    const packageJsonPath = path.join(tempDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('脚本包必须包含package.json文件');
    }
    
    let packageInfo: any;
    try {
      const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
      packageInfo = JSON.parse(packageContent);
    } catch (error) {
      throw new Error('package.json格式错误');
    }
    
    if (!packageInfo.main) {
      throw new Error('package.json中必须包含main字段指定入口文件');
    }
    
    const entryPoint = packageInfo.main;
    
    // 读取入口文件
    const entryFilePath = path.join(tempDir, entryPoint);
    if (!fs.existsSync(entryFilePath)) {
      throw new Error(`入口文件不存在: ${entryPoint}`);
    }
    
    const entryScript = fs.readFileSync(entryFilePath, "utf-8");
    
    // 创建包装脚本，支持require模块加载
    return this.createPackageWrapper(tempDir, entryScript, entryPoint);
  }

  /**
   * 创建包装脚本，支持require模块加载
   */
  private createPackageWrapper(packageDir: string, entryScript: string, entryPoint: string): string {
    return `
      // 脚本包执行环境
      (async function() {
        console.log('进来脚本拉');
        const originalRequire = typeof require !== 'undefined' ? require : undefined;
        console.log('默认 require ');
        const Module = originalRequire ? originalRequire('module') : null;
        const packageDir = '${packageDir.replace(/\\/g, '\\\\')}';
        
        // 自定义require函数
        function customRequire(modulePath) {
          if (!originalRequire || !Module) {
            throw new Error('require is not available in this environment');
          }
          
          // 处理相对路径
          if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            const path = originalRequire('path');
            const fs = originalRequire('fs');
            const resolvedPath = path.resolve(packageDir, modulePath);
            
            // 尝试添加.js扩展名
            let finalPath = resolvedPath;
            if (!fs.existsSync(resolvedPath) && !resolvedPath.endsWith('.js')) {
              finalPath = resolvedPath + '.js';
            }
            
            if (!fs.existsSync(finalPath)) {
              throw new Error(\`Module not found: \${modulePath}\`);
            }
            
            // 读取并执行模块
            const moduleContent = fs.readFileSync(finalPath, 'utf-8');
            const moduleExports = {};
            const module = { exports: moduleExports };
            
            // 创建模块执行环境
            const moduleFunction = new Function('require', 'module', 'exports', '__filename', '__dirname', moduleContent);
            moduleFunction(customRequire, module, moduleExports, finalPath, path.dirname(finalPath));
            
            return module.exports;
          }
          
          // 对于非相对路径，使用原始require
          return originalRequire(modulePath);
        }
        
        // 替换全局require
        const require = customRequire;
        
        // 执行入口脚本并获取导出
        const moduleExports = {};
        const module = { exports: moduleExports };
        
        // 执行入口脚本
        const entryFunction = new Function('require', 'module', 'exports', 'routeParams', 'utils', 'auth', 'console', 'dayjs', \`
          ${entryScript}
        \`);
        
        entryFunction(customRequire, module, moduleExports, routeParams, utils, auth, console, dayjs);
        
        // 验证是否导出了main函数
        if (!module.exports || typeof module.exports.main !== 'function') {
          throw new Error('脚本包必须导出一个名为"main"的函数。请参考脚本规范文档：SCRIPT_STANDARDS.md');
        }
        
        // 创建标准上下文对象
        const context = {
          routeParams: routeParams || {},
          utils: utils || {},
          auth: auth || {},
          console: console || {},
          dayjs: dayjs,
          require: customRequire
        };
        
        // 调用main函数
        return await module.exports.main(context);
      })();
    `;
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
        feed_url: `${process.env.API_BASE_URL || ""}/api/dynamic-route${route.path}`,
        site_url: `${process.env.API_BASE_URL || ""}/api/dynamic-route${route.path}`,
        generator: "FeedHub DynamicRoute",
        pubDate: new Date(),
      });

      // 添加项目
      scriptResult.items.forEach((item: any) => {
        const itemOptions: any = {
          title: item.title,
          description: item.content || item.contentSnippet || "",
          url: item.link,
          guid: item.guid || item.link || uuidv4(),
          date: item.pubDate,
          author: item.author,
        };

        // 添加封面图片作为enclosure（如果存在）
        if (item.image) {
          itemOptions.enclosure = {
            url: item.image,
            type: "image/jpeg", // 默认类型，实际应用中可根据图片URL后缀判断
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
      feed_url:
        scriptResult.feed_url || `${process.env.API_BASE_URL || ""}/api/dynamic-route${route.path}`,
      site_url:
        scriptResult.site_url || `${process.env.API_BASE_URL || ""}/api/dynamic-route${route.path}`,
      generator: scriptResult.generator || "FeedHub DynamicRoute",
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
        description: item.content || item.contentSnippet || "",
        url: item.link,
        guid: item.guid || item.link || uuidv4(),
        date: item.pubDate,
        author: item.author,
      };

      // 添加封面图片作为enclosure（如果存在）
      if (item.image) {
        itemOptions.enclosure = {
          url: item.image,
          type: "image/jpeg", // 默认类型，实际应用中可根据图片URL后缀判断
        };
      }

      feed.item(itemOptions);
    });

    return feed.xml({ indent: true });
  }
}
