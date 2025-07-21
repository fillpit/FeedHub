import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { RssTemplateService } from "../services/RssTemplateService";
import { ApiResponse } from "../core/ApiResponse";
import { logger } from "../utils/logger";
import { BaseController } from "./BaseController";

@injectable()
export class RssTemplateController extends BaseController {

  constructor(@inject(TYPES.RssTemplateService) private rssTemplateService: RssTemplateService) {
    super();
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.rssTemplateService.getAllTemplates();
    });
  }

  /**
   * 根据ID获取模板
   */
  async getTemplateById(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;
      const templateId = parseInt(id);
      if (isNaN(templateId)) {
        throw new Error("无效的模板ID");
      }
      return await this.rssTemplateService.getTemplateById(templateId);
    });
  }

  /**
   * 创建模板
   */
  async createTemplate(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const templateData = req.body;
      // 验证必需字段
      const requiredFields = ["name", "description", "platform", "icon", "urlTemplate", "scriptTemplate", "parameters"];
      for (const field of requiredFields) {
        if (!templateData[field]) {
          throw new Error(`字段 "${field}" 是必需的`);
        }
      }
      return await this.rssTemplateService.createTemplate(templateData);
    });
  }

  /**
   * 更新模板
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;
      const templateId = parseInt(id);
      const templateData = req.body;
      console.log('templateData', templateData)
      if (isNaN(templateId)) {
        throw new Error("无效的模板ID");
      }
      return await this.rssTemplateService.updateTemplate(templateId, templateData);
    });
  }

  /**
   * 删除模板
   */
  async deleteTemplate(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;
      const templateId = parseInt(id);
      if (isNaN(templateId)) {
        throw new Error("无效的模板ID");
      }
      return await this.rssTemplateService.deleteTemplate(templateId);
    });
  }

  /**
   * 根据模板生成RSS配置
   */
  async generateRssConfig(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { templateId, parameters } = req.body;
      if (!templateId || !parameters) {
        throw new Error("模板ID和参数是必需的");
      }
      return await this.rssTemplateService.generateRssConfig(templateId, parameters);
    });
  }

  /**
   * 初始化默认模板
   */
  async initializeDefaultTemplates(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      await this.rssTemplateService.initializeDefaultTemplates();
      return { data: null, message: "初始化默认模板成功" };
    });
  }

  /**
   * 模板调试接口
   */
  async debugTemplate(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { template, parameters, authCredentialId } = req.body;
      if (!template || !parameters) {
        throw new Error("模板内容和参数是必需的");
      }
      // 只在未传authCredentialId时，允许用parameters里的自定义授权
      return await this.rssTemplateService.debugTemplate({ template, parameters, authCredentialId });
    });
  }

  /**
   * 从模板直接创建RSS配置
   */
  async createRssConfigFromTemplate(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { templateId, parameters } = req.body;
      if (!templateId || !parameters) {
        throw new Error("模板ID和参数是必需的");
      }
      return await this.rssTemplateService.createRssConfigFromTemplate(templateId, parameters);
    });
  }

  /**
   * 批量更新使用指定模板的所有配置
   */
  async updateConfigsByTemplate(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;
      const templateId = parseInt(id);
      if (isNaN(templateId)) {
        throw new Error("无效的模板ID");
      }
      return await this.rssTemplateService.updateConfigsByTemplate(templateId);
    });
  }

  /**
   * 获取使用指定模板的配置列表
   */
  async getConfigsByTemplate(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { id } = req.params;
      const templateId = parseInt(id);
      if (isNaN(templateId)) {
        throw new Error("无效的模板ID");
      }
      return await this.rssTemplateService.getConfigsByTemplate(templateId);
    });
  }
}
