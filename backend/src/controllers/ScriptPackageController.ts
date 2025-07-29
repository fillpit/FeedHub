import { Request, Response } from "express";
import { injectable } from "inversify";
import { ScriptPackageService } from "../services/ScriptPackageService";
import { ApiResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

@injectable()
export class ScriptPackageController {
  constructor(
    private scriptPackageService: ScriptPackageService = new ScriptPackageService()
  ) {}

  /**
   * 预览脚本包内容
   */
  async previewPackage(req: Request, res: Response): Promise<void> {
    try {
      const { file } = req.query;
      
      if (!file || typeof file !== 'string') {
        res.json(ApiResponse.error("缺少文件参数"));
        return;
      }

      const previewData = await this.scriptPackageService.previewPackage(file);
      res.json(ApiResponse.success(previewData));
    } catch (error) {
      logger.error("预览脚本包失败:", error);
      res.json(ApiResponse.error((error as Error).message || "预览脚本包失败"));
    }
  }

  /**
   * 验证脚本包结构
   */
  async validatePackage(req: Request, res: Response): Promise<void> {
    try {
      const { file } = req.query;
      
      if (!file || typeof file !== 'string') {
        res.json(ApiResponse.error("缺少文件参数"));
        return;
      }

      const validationResult = await this.scriptPackageService.validatePackage(file);
      res.json(ApiResponse.success(validationResult));
    } catch (error) {
      logger.error("验证脚本包失败:", error);
      res.json(ApiResponse.error((error as Error).message || "验证脚本包失败"));
    }
  }

  /**
   * 获取脚本包模板列表
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await this.scriptPackageService.getTemplates();
      res.json(ApiResponse.success(templates));
    } catch (error) {
      logger.error("获取脚本包模板失败:", error);
      res.json(ApiResponse.error((error as Error).message || "获取脚本包模板失败"));
    }
  }

  /**
   * 下载脚本包模板
   */
  async downloadTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      
      if (!templateId) {
        res.json(ApiResponse.error("缺少模板ID参数"));
        return;
      }

      const templateData = await this.scriptPackageService.downloadTemplate(templateId);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${templateData.filename}"`);
      res.send(templateData.buffer);
    } catch (error) {
      logger.error("下载脚本包模板失败:", error);
      res.json(ApiResponse.error((error as Error).message || "下载脚本包模板失败"));
    }
  }

  /**
   * 创建编辑会话
   */
  async createEditSession(req: Request, res: Response): Promise<void> {
    try {
      const { file } = req.query;
      
      if (!file || typeof file !== 'string') {
        res.json(ApiResponse.error("缺少文件参数"));
        return;
      }

      const sessionId = await this.scriptPackageService.createEditSession(file);
      res.json(ApiResponse.success({ sessionId }));
    } catch (error) {
      logger.error("创建编辑会话失败:", error);
      res.json(ApiResponse.error((error as Error).message || "创建编辑会话失败"));
    }
  }

  /**
   * 获取编辑会话文件列表
   */
  async getEditSessionFiles(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.json(ApiResponse.error("缺少会话ID参数"));
        return;
      }

      const files = await this.scriptPackageService.getEditSessionFiles(sessionId);
      res.json(ApiResponse.success(files));
    } catch (error) {
      logger.error("获取编辑会话文件列表失败:", error);
      res.json(ApiResponse.error((error as Error).message || "获取编辑会话文件列表失败"));
    }
  }

  /**
   * 获取编辑会话文件内容
   */
  async getEditSessionFileContent(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { filePath } = req.query;
      
      if (!sessionId) {
        res.json(ApiResponse.error("缺少会话ID参数"));
        return;
      }
      
      if (!filePath || typeof filePath !== 'string') {
        res.json(ApiResponse.error("缺少文件路径参数"));
        return;
      }

      const fileContent = await this.scriptPackageService.getEditSessionFileContent(sessionId, filePath);
      res.json(ApiResponse.success(fileContent));
    } catch (error) {
      logger.error("获取编辑会话文件内容失败:", error);
      res.json(ApiResponse.error((error as Error).message || "获取编辑会话文件内容失败"));
    }
  }

  /**
   * 保存编辑会话文件内容
   */
  async saveEditSessionFileContent(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { filePath, content } = req.body;
      
      if (!sessionId) {
        res.json(ApiResponse.error("缺少会话ID参数"));
        return;
      }
      
      if (!filePath || typeof filePath !== 'string') {
        res.json(ApiResponse.error("缺少文件路径参数"));
        return;
      }
      
      if (content === undefined) {
        res.json(ApiResponse.error("缺少文件内容参数"));
        return;
      }

      await this.scriptPackageService.saveEditSessionFileContent(sessionId, filePath, content);
      res.json(ApiResponse.success(null, "文件保存成功"));
    } catch (error) {
      logger.error("保存编辑会话文件内容失败:", error);
      res.json(ApiResponse.error((error as Error).message || "保存编辑会话文件内容失败"));
    }
  }

  /**
   * 关闭编辑会话
   */
  async closeEditSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.json(ApiResponse.error("缺少会话ID参数"));
        return;
      }

      await this.scriptPackageService.closeEditSession(sessionId);
      res.json(ApiResponse.success(null, "编辑会话已关闭"));
    } catch (error) {
      logger.error("关闭编辑会话失败:", error);
      res.json(ApiResponse.error((error as Error).message || "关闭编辑会话失败"));
    }
  }

  /**
   * 导出编辑会话为脚本包
   */
  async exportEditSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.json(ApiResponse.error("缺少会话ID参数"));
        return;
      }

      const exportData = await this.scriptPackageService.exportEditSession(sessionId);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.send(exportData.buffer);
    } catch (error) {
      logger.error("导出编辑会话失败:", error);
      res.json(ApiResponse.error((error as Error).message || "导出编辑会话失败"));
    }
  }
}