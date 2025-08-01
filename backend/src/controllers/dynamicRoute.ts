import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { DynamicRouteService } from "../services/DynamicRouteService";
import { NotificationService } from "../services/NotificationService";
import { BaseController } from "./BaseController";
import { logger } from "../utils/logger";
import { ExceptionHandler } from "winston";
import { AppError, ValidationError } from "@feedhub/shared";

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
      return await this.dynamicRouteService.updateInlineScriptFileContent(routeId, fileName, content);
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
        gitSubPath
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
   * 导出路由配置和脚本文件
   */
  async exportRoutesWithScripts(req: Request, res: Response): Promise<void> {
    try {
      const routeIds = req.body.routeIds as number[];
      if (!Array.isArray(routeIds) || routeIds.length === 0) {
        res.status(400).json({ success: false, message: '请提供有效的路由ID列表' });
        return;
      }

      const zipBuffer = await this.dynamicRouteService.exportRoutesWithScripts(routeIds);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="routes-export-${Date.now()}.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出失败';
      logger.error('[DynamicRouteController] 导出路由失败:', error);
      res.status(500).json({ success: false, message: errorMessage });
    }
  }

  /**
   * 导入路由配置和脚本文件
   */
  async importRoutesWithScripts(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
     if (!req.file) {
        throw new AppError('请上传ZIP文件');
      }

      return await this.dynamicRouteService.importRoutesWithScripts(req.file.buffer);
    })
  }

  /**
   * 执行自定义路由脚本并返回RSS
   */
  async executeRouteScript(req: Request, res: Response): Promise<void> {
    const routePath = req.params[0]; // 使用通配符路由，获取完整路径

    try {
      const responseContent = await this.dynamicRouteService.executeRouteScript(routePath, req.query);

      // 根据type参数设置正确的内容类型
      const responseType = (req.query.type as string) || 'rss';
      if (responseType === 'json') {
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
