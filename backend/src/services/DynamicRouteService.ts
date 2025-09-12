import { injectable, inject } from "inversify";
import DynamicRouteConfig, {
  DynamicRouteConfigAttributes,
  RouteParam,
} from "../models/DynamicRouteConfig";
import { AppError, HTTP_STATUS } from "@feedhub/shared";
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
import { ICacheService, getCacheService } from "./cache";
import AdmZip from "adm-zip";
import { simpleGit } from "simple-git";

import { ScriptFileService } from "./ScriptFileService";
import { ScriptTemplateService } from "./ScriptTemplateService";

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

    @inject(TYPES.ScriptFileService) private scriptFileService: ScriptFileService,
    @inject(TYPES.ScriptTemplateService) private scriptTemplateService: ScriptTemplateService
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

    // 统一使用内联脚本：创建脚本目录并保存到文件系统
    // 只有当用户提供了脚本目录时才创建脚本目录
    if (routeData.script.folder && routeData.script.folder.trim()) {
      try {
        // 创建脚本目录
        const scriptDirName = await this.scriptFileService.createRouteScriptDirectory(
          routeData.name
        );

        // 写入用户提供的脚本目录到main.js
        await this.scriptFileService.writeScriptFile(
          scriptDirName,
          "main.js",
          routeData.script.folder
        );

        // 更新脚本配置，将folder改为脚本目录名称
        routeData.script.folder = scriptDirName;

        logger.info(
          `[DynamicRouteService] 为路由 "${routeData.name}" 创建脚本目录: ${scriptDirName}`
        );
      } catch (error) {
        logger.error(`[DynamicRouteService] 创建脚本目录失败:`, error);
        throw new Error(`创建脚本目录失败: ${(error as Error).message}`);
      }
    } else {
      // 脚本目录为空，标记为未初始化状态
      routeData.script.folder = "";
      logger.info(`[DynamicRouteService] 路由 "${routeData.name}" 创建成功，脚本未初始化`);
    }

    // 设置脚本类型为内联
    routeData.script.sourceType = "inline";

    // 确保params数组存在
    if (!routeData.params) {
      routeData.params = [];
    }

    // 不再自动添加默认的type参数，type参数只在访问/dynamic/xxxx路由时从查询参数中获取

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
   * @returns 文件和目录的详细信息列表
   */
  async getInlineScriptFiles(routeId: number): Promise<
    ApiResponseData<
      Array<{
        name: string;
        path: string;
        type: "file" | "directory";
        extension?: string;
        size?: number;
        lastModified?: Date;
      }>
    >
  > {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);

    if (route.script.sourceType !== "inline") {
      throw new Error("该路由不是内联脚本类型");
    }

    // 检查脚本目录是否为空
    if (!route.script.folder || route.script.folder.trim() === "") {
      return { success: true, data: [], message: "脚本尚未初始化，文件列表为空" };
    }

    try {
      const files = await this.scriptFileService.getScriptFiles(route.script.folder);
      return { success: true, data: files, message: "获取文件列表成功" };
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
  async getInlineScriptFileContent(
    routeId: number,
    fileName: string
  ): Promise<ApiResponseData<{ content: string }>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);

    if (route.script.sourceType !== "inline") {
      throw new Error("该路由不是内联脚本类型");
    }

    const scriptDirName = route.script.folder;
    if (!scriptDirName || scriptDirName.trim() === "") {
      throw new Error("脚本尚未初始化，请先初始化脚本");
    }

    try {
      const content = await this.scriptFileService.readScriptFile(route.script.folder, fileName);
      return { success: true, data: { content }, message: "获取文件内容成功" };
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
  async updateInlineScriptFileContent(
    routeId: number,
    fileName: string,
    content: string
  ): Promise<ApiResponseData<void>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);

    const scriptDirName = route.script.folder;
    if (!scriptDirName || scriptDirName.trim() === "") {
      throw new Error("脚本尚未初始化，请先初始化脚本");
    }

    try {
      await this.scriptFileService.writeScriptFile(route.script.folder, fileName, content);

      // 清除相关缓存
      await this.clearRouteCache(route.path);

      return { success: true, data: undefined, message: "更新文件内容成功" };
    } catch (error) {
      throw new Error(`更新文件内容失败: ${(error as Error).message}`);
    }
  }

  /**
   * 创建内联脚本文件
   * @param routeId 路由ID
   * @param fileName 文件名
   * @param template 模板类型
   */
  async createInlineScriptFile(
    routeId: number,
    fileName: string,
    template: string = "blank"
  ): Promise<ApiResponseData<void>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);

    if (route.script.sourceType !== "inline") {
      throw new Error("只有内联脚本类型的路由才支持文件创建");
    }

    const scriptDirName = route.script.folder;
    if (!scriptDirName || scriptDirName.trim() === "") {
      throw new Error("脚本尚未初始化，请先初始化脚本");
    }

    // 检查文件是否已存在
    const existingFiles = await this.scriptFileService.getScriptFilePaths(scriptDirName);
    if (existingFiles.includes(fileName)) {
      throw new Error(`文件 ${fileName} 已存在`);
    }

    // 根据模板生成文件内容
    const content = this.scriptTemplateService.getFileTemplate(fileName, template);

    await this.scriptFileService.writeScriptFile(scriptDirName, fileName, content);

    return { success: true, data: undefined, message: "文件创建成功" };
  }

  /**
   * 删除内联脚本文件
   * @param routeId 路由ID
   * @param fileName 文件名
   */
  async deleteInlineScriptFile(routeId: number, fileName: string): Promise<ApiResponseData<void>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) throw new Error(`未找到ID为${routeId}的动态路由配置`);

    if (route.script.sourceType !== "inline") {
      throw new Error("只有内联脚本类型的路由才支持文件删除");
    }

    const scriptDirName = route.script.folder;
    if (!scriptDirName || scriptDirName.trim() === "") {
      throw new Error("脚本尚未初始化，请先初始化脚本");
    }

    // 不允许删除主文件
    if (fileName === "main.js" || fileName === "index.js") {
      throw new Error("不能删除主入口文件");
    }

    await this.scriptFileService.deleteScriptFile(scriptDirName, fileName);

    return { success: true, data: undefined, message: "文件删除成功" };
  }

  /**
   * 根据路径获取路由的README内容
   */
  async getRouteReadmeByPath(routePath: string): Promise<string | null> {
    try {
      // 根据路径查找路由配置
      const routeMatch = await this.getRouteByPathPattern(routePath);

      if (!routeMatch) {
        logger.warn(`Route not found for path: ${routePath}`);
        return null;
      }

      const route = routeMatch.route;

      // 检查是否为内联脚本类型
      if (route.script.sourceType !== "inline" || !route.script.folder) {
        logger.warn(`Route ${routePath} is not an inline script or has no folder`);
        return null;
      }

      // 检查README文件是否存在
      const hasReadme = await this.scriptFileService.hasReadmeFile(route.script.folder);
      if (!hasReadme) {
        logger.warn(`No README found for route: ${routePath}`);
        return null;
      }

      // 获取README内容
      const readmeContent = await this.scriptFileService.readReadmeFile(route.script.folder);

      if (!readmeContent) {
        logger.warn(`README content is empty for route: ${routePath}`);
        return null;
      }

      // 在README内容中动态替换路径参数信息
      let processedContent = readmeContent;

      if (routeMatch.pathParams && Object.keys(routeMatch.pathParams).length > 0) {
        // 添加当前请求的路径参数信息
        const pathParamsInfo = Object.entries(routeMatch.pathParams)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n");

        processedContent += `\n\n## 当前请求路径参数\n\n${pathParamsInfo}`;
      }

      return processedContent;
    } catch (error) {
      logger.error(`Error getting route README by path ${routePath}:`, error);
      return null;
    }
  }

  /**
   * 获取路由的README内容
   */
  async getRouteReadme(routeId: number): Promise<ApiResponseData<string>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) {
      return { success: false, message: "路由不存在", data: undefined };
    }

    if (route.script.sourceType !== "inline") {
      return {
        success: false,
        message: "只有内联脚本类型的路由支持README查看",
        data: undefined,
      };
    }

    const scriptDirName = route.script.folder;
    if (!scriptDirName || scriptDirName.trim() === "") {
      return { success: false, message: "脚本尚未初始化，请先初始化脚本", data: undefined };
    }

    try {
      const hasReadme = await this.scriptFileService.hasReadmeFile(scriptDirName);
      if (!hasReadme) {
        return {
          success: true,
          data: "",
          message: "README文件不存在",
        };
      }

      const content = await this.scriptFileService.readReadmeFile(scriptDirName);
      return {
        success: true,
        data: content,
        message: "README内容获取成功",
      };
    } catch (error) {
      logger.error(`[DynamicRouteService] 获取README内容失败: ${error}`);
      return {
        success: false,
        message: `获取README内容失败: ${error instanceof Error ? error.message : String(error)}`,
        data: undefined,
      };
    }
  }

  /**
   * 更新路由的README内容
   */
  async updateRouteReadme(routeId: number, content: string): Promise<ApiResponseData<void>> {
    const route = await DynamicRouteConfig.findByPk(routeId);
    if (!route) {
      return { success: false, message: "路由不存在", data: undefined };
    }

    if (route.script.sourceType !== "inline") {
      return {
        success: false,
        message: "只有内联脚本类型的路由支持README编辑",
        data: undefined,
      };
    }

    const scriptDirName = route.script.folder;
    if (!scriptDirName || scriptDirName.trim() === "") {
      return { success: false, message: "脚本尚未初始化，请先初始化脚本", data: undefined };
    }

    try {
      await this.scriptFileService.writeReadmeFile(scriptDirName, content);
      return {
        success: true,
        data: undefined,
        message: "README内容更新成功",
      };
    } catch (error) {
      logger.error(`[DynamicRouteService] 更新README内容失败: ${error}`);
      return {
        success: false,
        message: `更新README内容失败: ${error instanceof Error ? error.message : String(error)}`,
        data: undefined,
      };
    }
  }

  /**
   * 初始化路由脚本
   */
  async initializeRouteScript(
    routeId: number,
    initType: "template" | "upload" | "git",
    options: {
      templateName?: string;
      zipBuffer?: Buffer;
      gitUrl?: string;
      gitBranch?: string;
      gitSubPath?: string;
    }
  ): Promise<ApiResponseData<void>> {
    try {
      const route = await DynamicRouteConfig.findByPk(routeId);
      if (!route) {
        return {
          success: false,
          message: "路由不存在",
          data: undefined,
        };
      }

      if (route.script.sourceType !== "inline") {
        return {
          success: false,
          message: "只有内联脚本类型的路由支持初始化",
          data: undefined,
        };
      }

      // 如果已经初始化过，先删除原有目录
      if (route.script.folder && route.script.folder.trim()) {
        await this.scriptFileService.deleteScriptDirectory(route.script.folder);
      }

      // 为路由创建新的脚本目录
      const scriptDirName = await this.scriptFileService.createRouteScriptDirectory(route.name);
      logger.info(`[DynamicRouteService] 创建脚本目录成功: ${scriptDirName}`);

      switch (initType) {
        case "template":
          await this.initializeFromTemplate(scriptDirName, options.templateName || "basic", route);
          logger.info(`[DynamicRouteService] 模板初始化完成: ${options.templateName || "basic"}`);
          break;
        case "upload":
          if (!options.zipBuffer) {
            throw new Error("上传文件不能为空");
          }
          logger.debug(
            `[DynamicRouteService] 开始初始化ZIP文件，文件大小: ${options.zipBuffer.length} bytes`
          );
          await this.initializeFromZip(scriptDirName, options.zipBuffer);
          logger.info(
            `[DynamicRouteService] ZIP文件初始化完成，文件大小: ${options.zipBuffer.length} bytes`
          );
          break;
        case "git":
          if (!options.gitUrl) {
            throw new Error("Git仓库地址不能为空");
          }
          await this.initializeFromGit(
            scriptDirName,
            options.gitUrl,
            options.gitBranch || "main",
            options.gitSubPath
          );

          // 保存Git配置信息
          const gitConfig = {
            gitUrl: options.gitUrl,
            gitBranch: options.gitBranch || "main",
            gitSubPath: options.gitSubPath,
            lastSyncAt: new Date(),
          };

          logger.info(
            `[DynamicRouteService] Git初始化完成: ${options.gitUrl}${options.gitSubPath ? ` (子目录: ${options.gitSubPath})` : ""}`
          );
          break;
        default:
          throw new Error("不支持的初始化类型");
      }

      // 更新路由配置
      logger.info(`[DynamicRouteService] 准备更新路由配置，scriptDirName: ${scriptDirName}`);

      const updatedScript = {
        ...route.script,
        folder: scriptDirName,
      };

      // 如果是Git初始化，添加Git配置
      if (initType === "git" && options.gitUrl) {
        updatedScript.gitConfig = {
          gitUrl: options.gitUrl,
          gitBranch: options.gitBranch || "main",
          gitSubPath: options.gitSubPath,
          lastSyncAt: new Date(),
        };
      }

      const updatedRoute = await route.update({
        script: updatedScript,
      });
      logger.info(
        `[DynamicRouteService] 路由配置更新完成，新的folder: ${updatedRoute.script.folder}`
      );

      logger.info(
        `[DynamicRouteService] 路由 "${route.name}" 脚本目录初始化成功，类型: ${initType}`
      );

      return {
        success: true,
        message: "脚本目录初始化成功",
        data: undefined,
      };
    } catch (error) {
      logger.error(`[DynamicRouteService] 初始化路由脚本目录失败:`, error);
      throw new AppError("初始化路由脚本目录失败", 500, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 从模板初始化脚本
   */
  private async initializeFromTemplate(
    scriptDirName: string,
    templateName: string,
    routeConfig?: any
  ): Promise<void> {
    await this.scriptTemplateService.initializeFromTemplate(
      scriptDirName,
      templateName,
      routeConfig
    );
  }

  /**
   * 从ZIP文件初始化脚本
   */
  private async initializeFromZip(scriptDirName: string, zipBuffer: Buffer): Promise<void> {
    console.log(`[DynamicRouteService] 开始初始化ZIP文件，文件大小: ${zipBuffer.length} bytes`);
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    console.log(`[DynamicRouteService] ZIP文件包含 ${entries.length} 个条目`);

    // 首先处理所有目录，确保目录结构存在
    for (const entry of entries) {
      if (entry.isDirectory) {
        const dirPath = entry.entryName.replace(/\/$/, ""); // 移除末尾的斜杠
        if (dirPath) {
          console.log(`[DynamicRouteService] 创建目录: ${dirPath}`);
          await this.scriptFileService.ensureDirectoryExists(scriptDirName, dirPath);
        }
      }
    }

    // 然后处理所有文件
    for (const entry of entries) {
      if (!entry.isDirectory) {
        try {
          const content = entry.getData().toString("utf8");
          const filePath = entry.entryName;
          console.log(`[DynamicRouteService] 写入文件: ${filePath}`);

          // 确保文件所在的目录存在
          const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
          if (dirPath) {
            await this.scriptFileService.ensureDirectoryExists(scriptDirName, dirPath);
          }

          await this.scriptFileService.writeScriptFile(scriptDirName, filePath, content);
        } catch (error) {
          console.error(`[DynamicRouteService] 处理文件 ${entry.entryName} 时出错:`, error);
          // 继续处理其他文件，不因单个文件错误而中断整个过程
        }
      }
    }

    console.log(`[DynamicRouteService] ZIP文件解压完成`);
  }

  /**
   * 从Git仓库初始化脚本
   */
  private async initializeFromGit(
    scriptDirName: string,
    gitUrl: string,
    branch: string,
    subPath?: string
  ): Promise<void> {
    const git = simpleGit();
    const tempDir = path.join(process.cwd(), "temp", `git-clone-${Date.now()}`);
    const scriptDir = this.scriptFileService.getScriptDirectoryPath(scriptDirName);

    try {
      // 确保临时目录存在
      if (!fs.existsSync(path.dirname(tempDir))) {
        fs.mkdirSync(path.dirname(tempDir), { recursive: true });
      }

      logger.info(`[DynamicRouteService] 开始克隆Git仓库: ${gitUrl}, 分支: ${branch}`);

      // 克隆仓库到临时目录
      await git.clone(gitUrl, tempDir, {
        "--branch": branch,
        "--depth": "1", // 浅克隆，只获取最新提交
        "--single-branch": null,
      });

      logger.info(`[DynamicRouteService] Git仓库克隆完成`);

      // 确定源目录路径
      const sourceDir = subPath ? path.join(tempDir, subPath) : tempDir;

      // 检查源目录是否存在
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`指定的目录路径不存在: ${subPath || "根目录"}`);
      }

      // 检查源目录是否为目录
      const sourceStat = fs.statSync(sourceDir);
      if (!sourceStat.isDirectory()) {
        throw new Error(`指定的路径不是目录: ${subPath || "根目录"}`);
      }

      // 复制文件到脚本目录（排除.git目录）
      await this.copyDirectoryContents(sourceDir, scriptDir, [".git", ".gitignore"]);

      logger.info(`[DynamicRouteService] 文件复制完成，从 ${sourceDir} 到 ${scriptDir}`);
    } catch (error) {
      logger.error(`[DynamicRouteService] Git初始化失败:`, error);
      throw new Error(`Git初始化失败: ${(error as Error).message}`);
    } finally {
      // 清理临时目录
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          logger.info(`[DynamicRouteService] 临时目录清理完成: ${tempDir}`);
        } catch (cleanupError) {
          logger.warn(`[DynamicRouteService] 临时目录清理失败: ${tempDir}`, cleanupError);
        }
      }
    }
  }

  /**
   * 同步Git仓库
   */
  async syncGitRepository(routeId: number): Promise<ApiResponseData<void>> {
    try {
      const route = await DynamicRouteConfig.findByPk(routeId);
      if (!route) {
        return {
          success: false,
          message: "路由不存在",
          data: undefined,
        };
      }

      if (route.script.sourceType !== "inline" || !route.script.gitConfig) {
        return {
          success: false,
          message: "该路由不是从Git仓库导入的，无法同步",
          data: undefined,
        };
      }

      const gitConfig = route.script.gitConfig;
      const scriptDirName = route.script.folder;

      logger.info(`[DynamicRouteService] 开始同步Git仓库: ${gitConfig.gitUrl}`);

      // 重新从Git克隆
      await this.initializeFromGit(
        scriptDirName,
        gitConfig.gitUrl,
        gitConfig.gitBranch,
        gitConfig.gitSubPath
      );

      // 更新最后同步时间
      const updatedScript = {
        ...route.script,
        gitConfig: {
          ...gitConfig,
          lastSyncAt: new Date(),
        },
      };

      await route.update({ script: updatedScript });

      logger.info(`[DynamicRouteService] Git仓库同步完成: ${gitConfig.gitUrl}`);

      return {
        success: true,
        message: "Git仓库同步成功",
        data: undefined,
      };
    } catch (error) {
      logger.error(`[DynamicRouteService] 同步Git仓库失败:`, error);
      return {
        success: false,
        message: `同步失败: ${(error as Error).message}`,
        data: undefined,
      };
    }
  }

  /**
   * 复制目录内容（排除指定文件/目录）
   */
  private async copyDirectoryContents(
    sourceDir: string,
    targetDir: string,
    excludes: string[] = []
  ): Promise<void> {
    const items = fs.readdirSync(sourceDir);

    for (const item of items) {
      // 跳过排除的文件/目录
      if (excludes.includes(item)) {
        continue;
      }

      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        // 创建目录并递归复制
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        await this.copyDirectoryContents(sourcePath, targetPath, excludes);
      } else {
        // 复制文件
        fs.copyFileSync(sourcePath, targetPath);
      }
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
    if (route.script.sourceType === "inline" && route.script.folder) {
      try {
        await this.scriptFileService.deleteScriptDirectory(route.script.folder);
        logger.info(
          `[DynamicRouteService] 删除内联脚本路由 "${route.name}" 的脚本目录: ${route.script.folder}`
        );
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
      this.axiosInstance
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

    // 检查type参数，决定返回格式（直接从查询参数获取，不通过路由参数配置）
    const responseType = (queryParams.type as string) || "rss";
    let responseContent: string;

    if (responseType === "json") {
      // 返回JSON格式
      responseContent = JSON.stringify(validatedResult, null, 2);
    } else {
      // 默认返回RSS格式
      responseContent = this.generateRssXml(route, validatedResult);
    }

    // 将结果存入缓存，使用refreshInterval作为缓存时间
    const refreshInterval = route.refreshInterval || 60; // 默认60分钟
    await this.setCache(cacheKey, responseContent, refreshInterval);

    logger.info(
      `[DynamicRouteService] 脚本执行完成，返回格式: ${responseType}，结果已缓存 ${refreshInterval} 分钟`
    );

    return responseContent;
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
      console.log("脚本内容获取完成", scriptContent);

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
   * 验证脚本配置
   */
  private validateScriptConfig(scriptConfig: any): void {
    if (!scriptConfig) throw new Error("脚本配置不能为空");
    // 统一使用内联脚本，不需要验证其他类型
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
    try {
      // 从文件系统读取内联脚本内容
      const scriptDirName = scriptConfig.folder;
      const scriptDir = this.scriptFileService.getScriptDirectoryPath(scriptDirName);

      // 读取package.json获取入口文件
      const packageJsonPath = path.join(scriptDir, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error("脚本目录必须包含package.json文件");
      }

      let packageInfo: any;
      try {
        const packageContent = fs.readFileSync(packageJsonPath, "utf-8");
        packageInfo = JSON.parse(packageContent);
      } catch (error) {
        throw new Error("package.json格式错误");
      }

      const entryPoint = packageInfo.main || "main.js";
      const entryFilePath = path.join(scriptDir, entryPoint);

      if (!fs.existsSync(entryFilePath)) {
        throw new Error(`入口文件不存在: ${entryPoint}`);
      }

      // 返回脚本包标识符，而不是复杂的包装脚本
      const packageInfo_new = {
        packageDir: scriptDir,
        entryPoint: entryPoint,
      };

      return `__SCRIPT_PACKAGE__:${JSON.stringify(packageInfo_new)}__`;
    } catch (error) {
      throw new Error(`无法读取内联脚本: ${(error as Error).message}`);
    }
  }

  /**
   * 创建包装脚本，支持require模块加载
   */
  private createPackageWrapper(
    packageDir: string,
    entryScript: string,
    entryPoint: string
  ): string {
    return `
      // 脚本包执行环境
      (async function() {
        console.log('进来脚本拉');
        const originalRequire = typeof require !== 'undefined' ? require : undefined;
        console.log('默认 require ');
        const Module = originalRequire ? originalRequire('module') : null;
        const packageDir = '${packageDir.replace(/\\/g, "\\\\")}';
        
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
        feed_url: `${process.env.API_BASE_URL || ""}/api/dynamic${route.path}`,
        site_url: `${process.env.API_BASE_URL || ""}/api/dynamic${route.path}`,
        generator: "FeedHub DynamicRoute",
        pubDate: new Date(),
      });

      // 添加项目
      scriptResult.items.forEach((item: any) => {
        const itemOptions: any = {
          title: item.title,
          description: item.description || item.content || "",
          url: item.link,
          guid: item.guid || item.link || uuidv4(),
          date: item.pubDate,
          author: item.author,
          image: item.image,
          attachments: item.attachments,
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
        scriptResult.feed_url || `${process.env.API_BASE_URL || ""}/api/dynamic${route.path}`,
      site_url:
        scriptResult.site_url || `${process.env.API_BASE_URL || ""}/api/dynamic${route.path}`,
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

  /**
   * 导出路由配置和脚本文件为ZIP包
   */
  async exportRoutesWithScripts(routeIds: number[]): Promise<Buffer> {
    const zip = new AdmZip();
    const exportData: any = {
      version: "1.0",
      exportTime: new Date().toISOString(),
      routes: [],
    };

    for (const routeId of routeIds) {
      const route = await DynamicRouteConfig.findByPk(routeId);
      if (!route) {
        logger.warn(`[DynamicRouteService] 导出时未找到路由ID: ${routeId}`);
        continue;
      }

      // 添加路由配置到导出数据
      exportData.routes.push({
        name: route.name,
        path: route.path,
        method: route.method,
        description: route.description,
        authCredentialId: route.authCredentialId,
        params: route.params,
        script: route.script,
        refreshInterval: route.refreshInterval,
      });

      // 如果是内联脚本且有脚本目录，添加脚本文件到ZIP
      if (route.script.sourceType === "inline" && route.script.folder) {
        try {
          const scriptFiles = await this.scriptFileService.getScriptFiles(route.script.folder);

          for (const file of scriptFiles) {
            if (file.type === "file") {
              const fileContent = await this.scriptFileService.readScriptFile(
                route.script.folder,
                file.path
              );
              const zipPath = `scripts/${route.name}/${file.path}`;
              zip.addFile(zipPath, Buffer.from(fileContent, "utf8"));
            }
          }

          logger.info(`[DynamicRouteService] 已添加路由 "${route.name}" 的脚本文件到导出包`);
        } catch (error) {
          logger.warn(`[DynamicRouteService] 导出路由 "${route.name}" 的脚本文件失败:`, error);
        }
      }
    }

    // 添加配置文件到ZIP
    zip.addFile("routes.json", Buffer.from(JSON.stringify(exportData, null, 2), "utf8"));

    logger.info(`[DynamicRouteService] 成功导出 ${exportData.routes.length} 个路由配置和脚本文件`);
    return zip.toBuffer();
  }

  /**
   * 从ZIP包导入路由配置和脚本文件
   */
  async importRoutesWithScripts(
    zipBuffer: Buffer
  ): Promise<ApiResponseData<{ successCount: number; failCount: number; errors: string[] }>> {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // 查找配置文件
    const configEntry = entries.find((entry) => entry.entryName === "routes.json");
    if (!configEntry) {
      throw new Error("导入包中未找到routes.json配置文件");
    }

    try {
      const configContent = configEntry.getData().toString("utf8");
      const importData = JSON.parse(configContent);

      if (!importData.routes || !Array.isArray(importData.routes)) {
        throw new Error("配置文件格式不正确，缺少routes数组");
      }

      // 导入每个路由
      for (const routeData of importData.routes) {
        try {
          // 确保路径以/开头
          if (!routeData.path.startsWith("/")) {
            routeData.path = "/" + routeData.path;
          }

          // 检查路径是否已存在
          const existingRoute = await DynamicRouteConfig.findOne({
            where: { path: routeData.path },
          });
          if (existingRoute) {
            errors.push(`路由路径 "${routeData.path}" 已存在，跳过导入`);
            failCount++;
            continue;
          }

          // 如果是内联脚本，创建脚本目录并导入脚本文件
          if (routeData.script.sourceType === "inline") {
            const scriptDirName = await this.scriptFileService.createRouteScriptDirectory(
              routeData.name
            );

            // 查找该路由的脚本文件
            const scriptPrefix = `scripts/${routeData.name}/`;
            const scriptEntries = entries.filter(
              (entry) => entry.entryName.startsWith(scriptPrefix) && !entry.isDirectory
            );

            if (scriptEntries.length > 0) {
              // 导入脚本文件
              for (const scriptEntry of scriptEntries) {
                const relativePath = scriptEntry.entryName.substring(scriptPrefix.length);
                const fileContent = scriptEntry.getData().toString("utf8");

                // 确保目录存在
                const dirPath = relativePath.substring(0, relativePath.lastIndexOf("/"));
                if (dirPath) {
                  await this.scriptFileService.ensureDirectoryExists(scriptDirName, dirPath);
                }

                await this.scriptFileService.writeScriptFile(
                  scriptDirName,
                  relativePath,
                  fileContent
                );
              }

              logger.info(
                `[DynamicRouteService] 已导入路由 "${routeData.name}" 的 ${scriptEntries.length} 个脚本文件`
              );
            }

            // 更新脚本配置
            routeData.script.folder = scriptDirName;
          }

          // 创建路由配置
          await DynamicRouteConfig.create(routeData);
          successCount++;

          logger.info(`[DynamicRouteService] 成功导入路由: ${routeData.name}`);
        } catch (error) {
          const errorMsg = `导入路由 "${routeData.name}" 失败: ${(error as Error).message}`;
          errors.push(errorMsg);
          failCount++;
          logger.error(`[DynamicRouteService] ${errorMsg}`, error);
        }
      }

      return {
        success: true,
        data: { successCount, failCount, errors },
        message: `导入完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      };
    } catch (error) {
      logger.error(`[DynamicRouteService] 解析导入包失败:`, error);
      throw new Error(`解析导入包失败: ${(error as Error).message}`);
    }
  }

  /**
   * 上传脚本到Git仓库
   */
  async uploadToGit(
    routeId: number,
    gitConfig: any,
    commitMessage?: string
  ): Promise<ApiResponseData<void>> {
    try {
      const route = await DynamicRouteConfig.findByPk(routeId);
      if (!route) {
        throw new AppError("路由不存在", HTTP_STATUS.NOT_FOUND);
      }

      if (route.script.sourceType !== "inline") {
        throw new AppError("只有内联脚本类型的路由才能上传到Git", HTTP_STATUS.BAD_REQUEST);
      }

      // 保存Git上传配置到路由
      const updatedScript = {
        ...route.script,
        gitConfig: {
          ...gitConfig,
          lastUploadTime: new Date().toISOString(),
        },
      };

      await route.update({ script: updatedScript });

      // 导入GitUploadService
      const { GitUploadService } = await import("./GitUploadService");
      const gitUploadService = new GitUploadService(this.scriptFileService);

      // 执行上传
       await gitUploadService.uploadToGit(
         route.script.folder!,
         {
           gitUrl: gitConfig.gitUrl,
           gitBranch: gitConfig.gitBranch || 'main',
           gitSubPath: gitConfig.gitSubPath,
           authType: gitConfig.authType || 'https',
           username: gitConfig.username,
           password: gitConfig.password,
           token: gitConfig.token,
           email: gitConfig.email,
           defaultCommitMessage: commitMessage || `Update scripts for route: ${route.name}`,
         }
       );

      logger.info(`[DynamicRouteService] 成功上传路由 ${route.name} 的脚本到Git仓库`);

      return {
        success: true,
        message: "脚本已成功上传到Git仓库",
      };
    } catch (error) {
      logger.error(`[DynamicRouteService] 上传脚本到Git失败:`, error);
      throw error;
    }
  }
}
