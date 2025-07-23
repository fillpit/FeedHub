import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { CustomRouteService } from "../services/CustomRouteService";
import { BaseController } from "./BaseController";

@injectable()
export class CustomRouteController extends BaseController {
  constructor(@inject(TYPES.CustomRouteService) private customRouteService: CustomRouteService) {
    super();
  }

  /**
   * 获取所有自定义路由配置
   */
  async getAllRoutes(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.customRouteService.getAllRoutes();
    });
  }

  /**
   * 根据ID获取自定义路由配置
   */
  async getRouteById(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.customRouteService.getRouteById(id);
    });
  }

  /**
   * 添加自定义路由配置
   */
  async addRoute(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.customRouteService.addRoute(req.body);
    });
  }

  /**
   * 更新自定义路由配置
   */
  async updateRoute(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.customRouteService.updateRoute(id, req.body);
    });
  }

  /**
   * 删除自定义路由配置
   */
  async deleteRoute(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.customRouteService.deleteRoute(id);
    });
  }

  /**
   * 调试自定义路由脚本
   */
  async debugRouteScript(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { routeConfig, params } = req.body;
      return await this.customRouteService.debugRouteScript(routeConfig, params);
    });
  }

  /**
   * 执行自定义路由脚本并返回RSS
   */
  async executeRouteScript(req: Request, res: Response): Promise<void> {
    try {
      const routePath = req.params[0]; // 使用通配符路由，获取完整路径
      const rssXml = await this.customRouteService.executeRouteScript(routePath, req.query);
      
      // 设置正确的内容类型
      res.setHeader('Content-Type', 'application/rss+xml');
      res.send(rssXml);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      res.status(404).send(`获取自定义路由RSS失败: ${errorMessage}`);
    }
  }
}