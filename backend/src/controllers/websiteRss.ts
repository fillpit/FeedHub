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

  async getRssFeed(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params.key;
      const rssXml = await this.websiteRssService.getRssFeed(key);

      // 设置正确的内容类型
      res.setHeader("Content-Type", "application/rss+xml");
      res.send(rssXml);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      res.status(404).send(`获取RSS Feed失败: ${errorMessage}`);
    }
  }

  async getRssFeedJson(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params.key;
      const rssFeedJson = await this.websiteRssService.getRssFeedJson(key);
      res.setHeader("Content-Type", "application/json");
      // 使用JSON.stringify的第三个参数来美化输出，设置缩进为2个空格
      res.send(JSON.stringify(rssFeedJson, null, 2));
    } catch (error) {
      console.error("获取JSON Feed失败:", error);
      res.status(500).json({
        error: `获取JSON Feed失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  async debugSelector(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.websiteRssService.debugSelector(req.body);
    });
  }
}
