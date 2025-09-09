import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import * as ejs from "ejs";
import * as path from "path";
import MarkdownIt from "markdown-it";
import { TYPES } from "../core/types";
import { DynamicRouteService } from "../services/DynamicRouteService";
import { NotificationService } from "../services/NotificationService";
import { BaseController } from "./BaseController";
import { logger } from "../utils/logger";
import { ExceptionHandler } from "winston";
import { AppError } from "@feedhub/shared";
import { ValidationError } from "../middleware/errorHandler";

@injectable()
export class DynamicRouteController extends BaseController {
  constructor(
    @inject(TYPES.DynamicRouteService) private dynamicRouteService: DynamicRouteService,
    @inject(TYPES.NotificationService) private notificationService: NotificationService
  ) {
    super();
  }

  /**
   * 获取所有自定义路由配置
   */
  async getAllDynamicRoutes(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.dynamicRouteService.getAllRoutes();
    });
  }

  /**
   * 根据ID获取自定义路由配置
   */
  async getDynamicRoute(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.dynamicRouteService.getRouteById(id);
    });
  }

  /**
   * 添加自定义路由配置
   */
  async addDynamicRoute(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.dynamicRouteService.addRoute(req.body);
    });
  }

  /**
   * 更新自定义路由配置
   */
  async updateDynamicRoute(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.dynamicRouteService.updateRoute(id, req.body);
    });
  }

  /**
   * 删除自定义路由配置
   */
  async deleteDynamicRoute(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.dynamicRouteService.deleteRoute(id);
    });
  }

  /**
   * 调试自定义路由脚本
   */
  async debugDynamicRouteScript(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { routeConfig, params } = req.body;
      return await this.dynamicRouteService.debugRouteScript(routeConfig, params);
    });
  }

  /**
   * 获取内联脚本的文件列表
   */
  async getInlineScriptFiles(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      return await this.dynamicRouteService.getInlineScriptFiles(routeId);
    });
  }

  /**
   * 获取内联脚本的文件内容
   */
  async getInlineScriptFileContent(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      const fileName = req.params.fileName;
      return await this.dynamicRouteService.getInlineScriptFileContent(routeId, fileName);
    });
  }

  /**
   * 更新内联脚本的文件内容
   */
  async updateInlineScriptFileContent(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      const { fileName, content } = req.body;
      return await this.dynamicRouteService.updateInlineScriptFileContent(
        routeId,
        fileName,
        content
      );
    });
  }

  /**
   * 创建内联脚本文件
   */
  async createInlineScriptFile(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      const { fileName, template } = req.body;
      return await this.dynamicRouteService.createInlineScriptFile(routeId, fileName, template);
    });
  }

  /**
   * 删除内联脚本文件
   */
  async deleteInlineScriptFile(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      const fileName = req.params.fileName;
      return await this.dynamicRouteService.deleteInlineScriptFile(routeId, fileName);
    });
  }

  /**
   * 获取路由的README内容
   */
  async getRouteReadme(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.dynamicRouteService.getRouteReadme(id);
    });
  }

  /**
   * 更新路由的README内容
   */
  async updateRouteReadme(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      const { content } = req.body;
      return await this.dynamicRouteService.updateRouteReadme(id, content);
    });
  }

  /**
   * 初始化路由脚本
   */
  async initializeRouteScript(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      const { initType, templateName, gitUrl, gitBranch, gitSubPath } = req.body;

      let zipBuffer: Buffer | undefined;
      if (req.file) {
        zipBuffer = req.file.buffer;
      }

      return await this.dynamicRouteService.initializeRouteScript(routeId, initType, {
        templateName,
        zipBuffer,
        gitUrl,
        gitBranch,
        gitSubPath,
      });
    });
  }

  /**
   * 同步Git仓库
   */
  async syncGitRepository(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      return await this.dynamicRouteService.syncGitRepository(routeId);
    });
  }

  /**
   * 上传脚本到Git仓库
   */
  async uploadToGit(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const routeId = Number(req.params.id);
      const { gitConfig, commitMessage } = req.body;
      return await this.dynamicRouteService.uploadToGit(routeId, gitConfig, commitMessage);
    });
  }

  /**
   * 导出路由配置和脚本文件
   */
  async exportRoutesWithScripts(req: Request, res: Response): Promise<void> {
    try {
      const routeIds = req.body.routeIds as number[];
      if (!Array.isArray(routeIds) || routeIds.length === 0) {
        res.status(400).json({ success: false, message: "请提供有效的路由ID列表" });
        return;
      }

      const zipBuffer = await this.dynamicRouteService.exportRoutesWithScripts(routeIds);

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="routes-export-${Date.now()}.zip"`
      );
      res.send(zipBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "导出失败";
      logger.error("[DynamicRouteController] 导出路由失败:", error);
      res.status(500).json({ success: false, message: errorMessage });
    }
  }

  /**
   * 导入路由配置和脚本文件
   */
  async importRoutesWithScripts(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      if (!req.file) {
        throw new AppError("请上传ZIP文件");
      }

      return await this.dynamicRouteService.importRoutesWithScripts(req.file.buffer);
    });
  }

  /**
   * 获取动态路由说明文档
   */
  async getRouteHelp(req: Request, res: Response): Promise<void> {
    try {
      // 从路径中提取实际的路由路径
      // /api/dynamic/help/news -> /news
      const fullPath = req.path;
      const helpPrefix = "/help";
      const helpIndex = fullPath.indexOf(helpPrefix);

      if (helpIndex === -1) {
        throw new ValidationError("Invalid help path format");
      }

      const routePath = fullPath.substring(helpIndex + helpPrefix.length) || "/";

      logger.info(`Getting help for route: ${routePath}`);

      const readmeContent = await this.dynamicRouteService.getRouteReadmeByPath(routePath);

      if (!readmeContent) {
        // 使用 EJS 模板渲染友好的错误页面
        const templatePath = path.join(__dirname, "../views/templates/not-found.ejs");

        ejs.renderFile(
          templatePath,
          {
            routePath,
          },
          {},
          (err: Error | null, html: string) => {
            if (err) {
              logger.error("错误页面模板渲染错误:", err);
              res.status(404).json({
                success: false,
                message: `No documentation found for route: ${routePath}`,
              });
              return;
            }

            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.status(404).send(html);
          }
        );
        return;
      }

      // 检查是否请求原始 Markdown 格式
      const format = req.query.format as string;
      if (format === "markdown") {
        // 返回原始 Markdown 格式
        res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        res.send(readmeContent);
        return;
      }

      // 使用 markdown-it 将 Markdown 转换为 HTML
      const md = new MarkdownIt();
      const htmlContent = md.render(readmeContent);

      // 使用 EJS 模板渲染页面
      const templatePath = path.join(__dirname, "../views/templates/markdown.ejs");

      // 获取路由名称作为标题
      let title = "动态路由文档";
      try {
        const routeMatch = await this.dynamicRouteService.getRouteByPathPattern(routePath);
        if (routeMatch && routeMatch.route) {
          title = routeMatch.route.name || "动态路由文档";
        }
      } catch (err) {
        logger.warn(`无法获取路由名称: ${err}`);
      }

      // 渲染模板
      ejs.renderFile(
        templatePath,
        {
          title,
          content: htmlContent,
          routePath,
        },
        {},
        (err: Error | null, html: string) => {
          if (err) {
            logger.error("模板渲染错误:", err);
            res.status(500).json({
              success: false,
              message: "模板渲染错误: " + err.message,
            });
            return;
          }

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.send(html);
        }
      );
    } catch (error) {
      logger.error("Error getting route help:", error);

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
          success: false,
          message: "Internal server error while getting route help: " + errorMessage,
        });
      }
    }
  }

  /**
   * 执行动态路由脚本
   */
  async executeRouteScript(req: Request, res: Response): Promise<void> {
    const routePath = req.params[0]; // 使用通配符路由，获取完整路径

    try {
      const responseContent = await this.dynamicRouteService.executeRouteScript(
        routePath,
        req.query
      );

      // 根据type参数设置正确的内容类型
      const responseType = (req.query.type as string) || "rss";
      if (responseType === "json") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      } else {
        res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      }

      res.send(responseContent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";

      // 记录错误日志
      logger.error(`[DynamicRouteController] 动态路由执行失败: ${routePath}`, {
        error: errorMessage,
        routePath,
        queryParams: req.query,
      });

      // 发送失败通知
      try {
        await this.sendDynamicRouteFailureNotification(routePath, errorMessage);
      } catch (notificationError) {
        logger.error(`[DynamicRouteController] 发送动态路由失败通知时出错:`, notificationError);
      }

      res.status(404).send(`获取自定义路由RSS失败: ${errorMessage}`);
    }
  }

  /**
   * 发送动态路由失败通知
   */
  private async sendDynamicRouteFailureNotification(
    routePath: string,
    errorMessage: string
  ): Promise<void> {
    try {
      // 获取管理员用户ID（这里假设管理员用户ID为 'admin'，实际项目中可能需要从配置或数据库获取）
      const adminUserId = "admin";

      await this.notificationService.sendDynamicRouteErrorNotification(
        adminUserId,
        routePath,
        errorMessage
      );

      logger.info(`[DynamicRouteController] 已发送动态路由失败通知: ${routePath}`);
    } catch (error) {
      logger.error(`[DynamicRouteController] 发送动态路由失败通知失败:`, error);
    }
  }
}
