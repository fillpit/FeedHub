import { injectable } from "inversify";
import * as fs from "fs";
import * as crypto from "crypto";
import Book from "../models/Book";
import Chapter from "../models/Chapter";
import {
  Chapter as ChapterInterface,
  ChapterParseResult,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "@feedhub/shared";
import { ApiResponseData } from "@/utils/apiResponse";


@injectable()
export class ChapterService {
  /**
   * 获取书籍的所有章节
   */
  async getChaptersByBookId(
    bookId: number,
    params?: PaginationParams
  ): Promise<ApiResponseData<PaginatedResponse<ChapterInterface>>> {
    try {
      const { page = 1, limit = 50, sortBy = 'chapterNumber', sortOrder = 'asc' } = params || {};
      const offset = (page - 1) * limit;

      const { count, rows } = await Chapter.findAndCountAll({
        where: { bookId },
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
      });

      return {
        success: true,
        data: {
          list: rows,
          total: count,
          page,
          pageSize: limit,
          hasMore: page * limit < count,
        },
        message: `成功获取${rows.length}个章节`,
      };
    } catch (error) {
      return {
        success: false,
        error: `获取章节列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 根据ID获取章节详情
   */
  async getChapterById(id: number): Promise<ApiResponseData<ChapterInterface>> {
    try {
      const chapter = await Chapter.findByPk(id, {
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author'],
          },
        ],
      });

      if (!chapter) {
        return {
          success: false,
          error: `未找到ID为${id}的章节`,
        };
      }

      return {
        success: true,
        data: chapter,
        message: "获取章节详情成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `获取章节详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 检查书籍更新
   */
  async checkBookUpdates(bookId: number): Promise<ApiResponseData<{ hasUpdates: boolean; newChapters: ChapterInterface[] }>> {
    try {
      const book = await Book.findByPk(bookId);
      if (!book) {
        return {
          success: false,
          error: `未找到ID为${bookId}的书籍`,
        };
      }

      let hasUpdates = false;
      let newChapters: ChapterInterface[] = [];

      if (book.sourceType === 'upload') {
        // 检查上传文件的更新
        const result = await this.checkUploadedFileUpdates(book);
        hasUpdates = result.hasUpdates;
        newChapters = result.newChapters;
      } else if (book.sourceType === 'opds') {
        // 检查OPDS源的更新
        const result = await this.checkOpdsUpdates(book);
        hasUpdates = result.hasUpdates;
        newChapters = result.newChapters;
      }

      if (hasUpdates && newChapters.length > 0) {
        // 更新书籍信息
        await book.update({
          totalChapters: book.totalChapters + newChapters.length,
          lastChapterTitle: newChapters[newChapters.length - 1].title,
        });

        // 标记新章节
        await Chapter.update(
          { isNew: false },
          { where: { bookId, isNew: true } }
        );
      }

      return {
        success: true,
        data: { hasUpdates, newChapters },
        message: hasUpdates ? `发现${newChapters.length}个新章节` : "暂无更新",
      };
    } catch (error) {
      return {
        success: false,
        error: `检查更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 检查上传文件的更新
   */
  private async checkUploadedFileUpdates(book: any): Promise<{ hasUpdates: boolean; newChapters: ChapterInterface[] }> {
    try {
      if (!book.sourcePath || !fs.existsSync(book.sourcePath)) {
        return { hasUpdates: false, newChapters: [] };
      }

      // 检查文件修改时间
      const stats = fs.statSync(book.sourcePath);
      const lastModified = stats.mtime;
      const lastUpdate = new Date(book.updatedAt);

      if (lastModified <= lastUpdate) {
        return { hasUpdates: false, newChapters: [] };
      }

      // 重新解析文件
      const parseResult = await this.parseBookFile(book.sourcePath, book.fileFormat);
      
      // 获取现有章节
      const existingChapters = await Chapter.findAll({
        where: { bookId: book.id },
        order: [['chapterNumber', 'ASC']],
      });

      // 找出新章节
      const newChapters: ChapterInterface[] = [];
      for (const parsedChapter of parseResult.chapters) {
        const existing = existingChapters.find(ch => ch.chapterNumber === parsedChapter.chapterNumber);
        if (!existing) {
          const newChapter = await Chapter.create({
            ...parsedChapter,
            bookId: book.id,
            isNew: true,
          });
          newChapters.push(newChapter);
        }
      }

      return { hasUpdates: newChapters.length > 0, newChapters };
    } catch (error) {
      console.error('检查上传文件更新失败:', error);
      return { hasUpdates: false, newChapters: [] };
    }
  }

  /**
   * 检查OPDS源的更新
   */
  private async checkOpdsUpdates(book: any): Promise<{ hasUpdates: boolean; newChapters: ChapterInterface[] }> {
    // TODO: 实现OPDS更新检查逻辑
    // 这里需要根据OPDS API来检查书籍是否有新章节
    return { hasUpdates: false, newChapters: [] };
  }

  /**
   * 解析书籍文件
   */
  private async parseBookFile(filePath: string, fileFormat: string): Promise<ChapterParseResult> {
    switch (fileFormat) {
      case 'txt':
        return this.parseTxtFile(filePath);
      default:
        throw new Error(`不支持的文件格式: ${fileFormat}`);
    }
  }

  /**
   * 解析TXT文件
   */
  private async parseTxtFile(filePath: string): Promise<ChapterParseResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const chapters: Omit<ChapterInterface, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>[] = [];
    
    // 简单的章节分割逻辑
    const chapterRegex = /第[\d一二三四五六七八九十百千万]+[章节]/g;
    const matches = [...content.matchAll(chapterRegex)];
    
    if (matches.length === 0) {
      // 如果没有找到章节标记，将整个文件作为一章
      chapters.push({
        chapterNumber: 1,
        title: '第一章',
        content: content.substring(0, 1000),
        wordCount: content.length,
        publishTime: new Date(),
        isNew: true,
      });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const startIndex = match.index!;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index! : content.length;
        const chapterContent = content.substring(startIndex, endIndex);
        
        chapters.push({
          chapterNumber: i + 1,
          title: match[0],
          content: chapterContent.substring(0, 1000),
          wordCount: chapterContent.length,
          publishTime: new Date(),
          isNew: true,
        });
      }
    }

    return {
      chapters,
      totalChapters: chapters.length,
      lastChapterTitle: chapters[chapters.length - 1]?.title,
    };
  }

  /**
   * 标记章节为已读
   */
  async markChapterAsRead(id: number): Promise<ApiResponseData<ChapterInterface>> {
    try {
      const chapter = await Chapter.findByPk(id);
      if (!chapter) {
        return {
          success: false,
          error: `未找到ID为${id}的章节`,
        };
      }

      await chapter.update({ isNew: false });

      return {
        success: true,
        data: chapter,
        message: "章节标记为已读",
      };
    } catch (error) {
      return {
        success: false,
        error: `标记章节失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 获取书籍的最新章节
   */
  async getLatestChapters(bookId: number, limit: number = 5): Promise<ApiResponseData<ChapterInterface[]>> {
    try {
      const chapters = await Chapter.findAll({
        where: { bookId },
        order: [['chapterNumber', 'DESC']],
        limit,
      });

      return {
        success: true,
        data: chapters,
        message: "获取最新章节成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `获取最新章节失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }
}