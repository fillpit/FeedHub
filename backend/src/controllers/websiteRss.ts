import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { WebsiteRssService } from "../services/WebsiteRssService";
import { BaseController } from "./BaseController";

@injectable()
export class WebsiteRssController extends BaseController {
  constructor(@inject(TYPES.WebsiteRssService) private websiteRssService: WebsiteRssService) {
    super();
  }

  async getAllConfigs(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.websiteRssService.getAllConfigs();
    });
  }

  async getConfigById(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.websiteRssService.getConfigById(id);
    });
  }

  async addConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.websiteRssService.addConfig(req.body);
    });
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.websiteRssService.updateConfig(id, req.body);
    });
  }

  async deleteConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.websiteRssService.deleteConfig(id);
    });
  }

  async refreshConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.websiteRssService.refreshConfig(id);
    });
  }

  async debugSelector(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.websiteRssService.debugSelector(req.body);
    });
  }

  async getSubscriptionFeed(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params.key;
      const type = req.query.type as string || 'rss';

      // 验证type参数
      if (type !== 'rss' && type !== 'json') {
        res.status(400).json({
          error: '无效的type参数，只支持rss或json'
        });
        return;
      }

      if (type === 'json') {
        // 返回JSON格式
        const rssFeedJson = await this.websiteRssService.getRssFeedJson(key);
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(rssFeedJson, null, 2));
      } else {
        // 返回RSS格式（默认）
        const rssXml = await this.websiteRssService.getRssFeed(key);
        res.setHeader("Content-Type", "application/rss+xml");
        res.send(rssXml);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      if (req.query.type === 'json') {
        res.status(500).json({
          error: `获取订阅Feed失败: ${errorMessage}`
        });
      } else {
        res.status(404).send(`获取订阅Feed失败: ${errorMessage}`);
      }
    }
  }
}
