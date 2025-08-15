import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { BookService } from "../services/BookService";
import { ChapterService } from "../services/ChapterService";
import { OpdsService } from "../services/OpdsService";

@injectable()
export class BookController {
  constructor(
    @inject(TYPES.BookService) private bookService: BookService,
    @inject(TYPES.ChapterService) private chapterService: ChapterService,
    @inject(TYPES.OpdsService) private opdsService: OpdsService
  ) {}

  /**
   * 获取所有书籍
   */
  async getAllBooks(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = req.query;
      const params = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await this.bookService.getAllBooks(params);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取书籍列表失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 根据ID获取书籍详情
   */
  async getBookById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bookId = parseInt(id);

      if (isNaN(bookId)) {
        res.status(400).json({
          success: false,
          error: "无效的书籍ID",
        });
        return;
      }

      const result = await this.bookService.getBookById(bookId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `获取书籍详情失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 上传书籍文件
   */
  async uploadBook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "请选择要上传的文件",
        });
        return;
      }

      const metadata = req.body;
      const result = await this.bookService.uploadBook(req.file, metadata);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `上传书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 从OPDS添加书籍
   */
  async addBookFromOpds(req: Request, res: Response): Promise<void> {
    try {
      const { bookData, opdsConfigId } = req.body;

      if (!bookData) {
        res.status(400).json({
          success: false,
          error: "缺少必要参数：bookData",
        });
        return;
      }

      // 从OPDS数据创建书籍记录
      const result = await this.bookService.addBookFromOpds(bookData, opdsConfigId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `从OPDS添加书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 更新书籍信息
   */
  async updateBook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bookId = parseInt(id);
      const updateData = req.body;

      if (isNaN(bookId)) {
        res.status(400).json({
          success: false,
          error: "无效的书籍ID",
        });
        return;
      }

      // TODO: 实现更新书籍信息的逻辑
      res.status(501).json({
        success: false,
        error: "更新书籍信息功能尚未实现",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `更新书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 删除书籍
   */
  async deleteBook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bookId = parseInt(id);

      if (isNaN(bookId)) {
        res.status(400).json({
          success: false,
          error: "无效的书籍ID",
        });
        return;
      }

      const result = await this.bookService.deleteBook(bookId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `删除书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }

  /**
   * 检查书籍更新
   */
  async checkUpdates(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bookId = parseInt(id);

      if (isNaN(bookId)) {
        res.status(400).json({
          success: false,
          error: "无效的书籍ID",
        });
        return;
      }

      const result = await this.chapterService.checkBookUpdates(bookId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `检查更新失败: ${error instanceof Error ? error.message : "未知错误"}`,
      });
    }
  }
}
