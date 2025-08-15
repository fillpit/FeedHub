import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { ChapterService } from "../services/ChapterService";

@injectable()
export class ChapterController {
  constructor(@inject(TYPES.ChapterService) private chapterService: ChapterService) {}

  /**
   * 根据书籍ID获取章节列表
   */
  async getChaptersByBookId(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      const { page, limit, sortBy, sortOrder } = req.query;

      const id = parseInt(bookId);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "无效的书籍ID",
        });
        return;
      }

      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await this.chapterService.getChaptersByBookId(id, params);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        error: `获取章节列表失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 根据章节ID获取章节详情
   */
  async getChapterById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const chapterId = parseInt(id);

      if (isNaN(chapterId)) {
        res.status(400).json({
          success: false,
          error: "无效的章节ID",
        });
        return;
      }

      const result = await this.chapterService.getChapterById(chapterId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取章节详情失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 检查书籍更新
   */
  async checkBookUpdates(req: Request, res: Response): Promise<void> {
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

      const result = await this.chapterService.checkBookUpdates(id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `检查更新失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 获取最新章节
   */
  async getLatestChapters(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      const { limit } = req.query;

      const id = parseInt(bookId);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "无效的书籍ID",
        });
        return;
      }

      const limitNum = limit ? parseInt(limit as string) : 10;
      const result = await this.chapterService.getLatestChapters(id, limitNum);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取最新章节失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 标记章节为已读
   */
  async markChapterAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const chapterId = parseInt(id);

      if (isNaN(chapterId)) {
        res.status(400).json({
          success: false,
          error: "无效的章节ID",
        });
        return;
      }

      const result = await this.chapterService.markChapterAsRead(chapterId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `标记章节失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }
}
