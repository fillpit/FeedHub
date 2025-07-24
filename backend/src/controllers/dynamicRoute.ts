import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { DynamicRouteService } from "../services/DynamicRouteService";
import { BaseController } from "./BaseController";

@injectable()
export class DynamicRouteController extends BaseController {
  constructor(@inject(TYPES.DynamicRouteService) private dynamicRouteService: DynamicRouteService) {
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
   * 执行自定义路由脚本并返回RSS
   */
  async executeRouteScript(req: Request, res: Response): Promise<void> {
    try {
      const routePath = req.params[0]; // 使用通配符路由，获取完整路径
      const rssXml = await this.dynamicRouteService.executeRouteScript(routePath, req.query);
      
      // 设置正确的内容类型
      res.setHeader('Content-Type', 'application/rss+xml');
      res.send(rssXml);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      res.status(404).send(`获取自定义路由RSS失败: ${errorMessage}`);
    }
  }
}