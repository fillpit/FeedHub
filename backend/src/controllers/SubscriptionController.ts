import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { SubscriptionService } from "../services/SubscriptionService";

@injectable()
export class SubscriptionController {
  constructor(
    @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService
  ) {}

  /**
   * 获取所有订阅
   */
  async getAllSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = req.query;
      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.subscriptionService.getSubscriptions(params);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取订阅列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  /**
   * 创建订阅
   */
  async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { bookId, ...subscriptionData } = req.body;

      if (!bookId) {
        res.status(400).json({
          success: false,
          error: "缺少必要参数：bookId",
        });
        return;
      }

      const result = await this.subscriptionService.createSubscription(bookId, subscriptionData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `创建订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  /**
   * 更新订阅
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const subscriptionId = parseInt(id);
      const updateData = req.body;

      if (isNaN(subscriptionId)) {
        res.status(400).json({
          success: false,
          error: "无效的订阅ID",
        });
        return;
      }

      const result = await this.subscriptionService.updateSubscription(subscriptionId, updateData);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `更新订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  /**
   * 删除订阅
   */
  async deleteSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const subscriptionId = parseInt(id);

      if (isNaN(subscriptionId)) {
        res.status(400).json({
          success: false,
          error: "无效的订阅ID",
        });
        return;
      }

      const result = await this.subscriptionService.deleteSubscription(subscriptionId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `删除订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  /**
   * 根据书籍ID获取订阅
   */
  async getSubscriptionsByBookId(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      const id = parseInt(bookId);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "无效的书籍ID",
        });
        return;
      }

      const result = await this.subscriptionService.getSubscriptionsByBookId(id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取书籍订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  /**
   * 获取RSS Feed
   */
  async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { format } = req.query;

      if (!key) {
        res.status(400).json({
          success: false,
          error: "缺少订阅key",
        });
        return;
      }

      const result = await this.subscriptionService.getFeedByKey(key, format as 'rss' | 'json');
      
      if (result.success) {
        if (typeof result.data === 'string') {
          // RSS XML格式
          res.set('Content-Type', 'application/rss+xml; charset=utf-8');
          res.send(result.data);
        } else {
          // JSON格式
          res.json(result.data);
        }
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取Feed失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  /**
   * 获取JSON Feed
   */
  async getJsonFeed(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;

      if (!key) {
        res.status(400).json({
          success: false,
          error: "缺少订阅key",
        });
        return;
      }

      const result = await this.subscriptionService.getFeedByKey(key, 'json');
      
      if (result.success) {
        res.json(result.data);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取JSON Feed失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }
}