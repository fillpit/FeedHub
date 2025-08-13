import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { BookRssService } from "../services/BookRssService";
import { BaseController } from "./BaseController";

@injectable()
export class BookRssController extends BaseController {
  constructor(@inject(TYPES.BookRssService) private bookRssService: BookRssService) {
    super();
  }

  async getAllConfigs(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.bookRssService.getAllConfigs();
    });
  }

  async getConfigById(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.bookRssService.getConfigById(id);
    });
  }

  async addConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      // 确保请求体不包含opdsConfig，因为现在使用全局设置
      const { opdsConfig, ...configData } = req.body;
      return await this.bookRssService.addConfig(configData);
    });
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      // 确保请求体不包含opdsConfig，因为现在使用全局设置
      const { opdsConfig, ...configData } = req.body;
      return await this.bookRssService.updateConfig(id, configData);
    });
  }

  async deleteConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.bookRssService.deleteConfig(id);
    });
  }

  async refreshConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.bookRssService.refreshConfig(id);
    });
  }

  async getRssFeed(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params.key;
      const rssXml = await this.bookRssService.getRssFeed(key);

      // 设置正确的内容类型
      res.setHeader("Content-Type", "application/rss+xml");
      res.send(rssXml);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      res.status(404).send(`获取图书RSS Feed失败: ${errorMessage}`);
    }
  }

  async getRssFeedJson(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params.key;
      const rssJson = await this.bookRssService.getRssFeedJson(key);

      // 设置正确的内容类型
      res.setHeader("Content-Type", "application/json");
      res.json(rssJson);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      res.status(404).json({ error: `获取图书RSS JSON失败: ${errorMessage}` });
    }
  }
}