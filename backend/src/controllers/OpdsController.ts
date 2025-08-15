import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { OpdsService } from "../services/OpdsService";

@injectable()
export class OpdsController {
  constructor(@inject(TYPES.OpdsService) private opdsService: OpdsService) {}

  /**
   * 获取所有OPDS配置
   */
  async getAllConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = req.query;
      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await this.opdsService.getAllOpdsConfigs(params);

      if (result.data) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取OPDS配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 根据ID获取OPDS配置
   */
  async getConfigById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const configId = parseInt(id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: "无效的配置ID",
        });
        return;
      }

      const result = await this.opdsService.getOpdsConfigById(configId);

      if (result.data) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取OPDS配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 创建OPDS配置
   */
  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const configData = req.body;

      if (!configData.name || !configData.url) {
        res.status(400).json({
          success: false,
          error: "缺少必要参数：name 和 url",
        });
        return;
      }

      const result = await this.opdsService.createOpdsConfig(configData);

      if (result.data) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `创建OPDS配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 更新OPDS配置
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const configId = parseInt(id);
      const updateData = req.body;

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: "无效的配置ID",
        });
        return;
      }

      const result = await this.opdsService.updateOpdsConfig(configId, updateData);

      if (result.data) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `更新OPDS配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 删除OPDS配置
   */
  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const configId = parseInt(id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: "无效的配置ID",
        });
        return;
      }

      const result = await this.opdsService.deleteOpdsConfig(configId);

      if (!result.error) {
        res.status(204).send();
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `删除OPDS配置失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 测试OPDS连接
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const configId = parseInt(id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: "无效的配置ID",
        });
        return;
      }

      const result = await this.opdsService.testOpdsConnection(configId);

      if (result.data) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `测试连接失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 从OPDS源获取书籍列表
   */
  async getBooksFromOpds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page, limit, search } = req.query;
      const configId = parseInt(id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: "无效的配置ID",
        });
        return;
      }

      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
      };

      const result = await this.opdsService.fetchBooksFromOpds(configId, params.search);

      if (result.data) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取OPDS书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 使用全局设置从OPDS获取书籍
   */
  async getBooksFromGlobalOpds(req: Request, res: Response): Promise<void> {
    try {
      const { search } = req.query;

      const result = await this.opdsService.fetchBooksFromGlobalOpds(search as string);

      if (result.data) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取全局OPDS书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 启用/禁用OPDS配置
   */
  async toggleConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      const configId = parseInt(id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: "无效的配置ID",
        });
        return;
      }

      if (typeof enabled !== "boolean") {
        res.status(400).json({
          success: false,
          error: "enabled参数必须是布尔值",
        });
        return;
      }

      const result = await this.opdsService.updateOpdsConfig(configId, { enabled });

      if (result.data) {
        res.json({
          success: true,
          message: `OPDS配置已${enabled ? "启用" : "禁用"}`,
          data: result.data,
        });
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `切换配置状态失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }
}
