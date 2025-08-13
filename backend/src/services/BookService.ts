import { injectable } from "inversify";
import { v4 as uuidv4 } from "uuid";
import axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as path from "path";
import Book from "../models/Book";
import Chapter from "../models/Chapter";

import {
  Book as BookInterface,
  Chapter as ChapterInterface,
  Subscription as SubscriptionInterface,
  ChapterParseResult,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "@feedhub/shared";

@injectable()
export class BookService {
  private axiosInstance: AxiosInstance;
  private uploadDir: string;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        "User-Agent": "FeedHub BookSubscription/1.0",
      },
    });
    // 从环境变量读取书籍存储路径，如果没有配置则默认使用项目根目录下的uploads/books
    const booksStoragePath = process.env.BOOKS_STORAGE_PATH;
    if (booksStoragePath) {
      // 如果是相对路径，则相对于项目根目录
      this.uploadDir = path.isAbsolute(booksStoragePath) 
        ? booksStoragePath 
        : path.join(process.cwd(), booksStoragePath);
    } else {
      this.uploadDir = path.join(process.cwd(), 'uploads', 'books');
    }
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 获取所有书籍
   */
  async getAllBooks(params?: PaginationParams) {
    try {
      const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = params || {};
      const offset = (page - 1) * limit;

      const { count, rows } = await Book.findAndCountAll({
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Chapter,
            as: 'chapters',
            attributes: ['id', 'chapterNumber', 'title', 'publishTime', 'isNew'],
            limit: 5,
            order: [['chapterNumber', 'DESC']],
          },
        ],
      });

      return {
        success: true,
        data: {
          items: rows,
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
        message: "获取书籍列表成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `获取书籍列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 根据ID获取书籍详情
   */
  async getBookById(id: number) {
    try {
      const book = await Book.findByPk(id, {
        include: [
          {
            model: Chapter,
            as: 'chapters',
            order: [['chapterNumber', 'ASC']],
          },
        ],
      });

      if (!book) {
        return {
          success: false,
          error: `未找到ID为${id}的书籍`,
        };
      }

      return {
        success: true,
        data: book,
        message: "获取书籍详情成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `获取书籍详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 从OPDS添加书籍
   */
  async addBookFromOpds(bookData: any, opdsConfigId?: number) {
    try {
      // 创建书籍记录
      const book = await Book.create({
        title: bookData.title || '未知标题',
        author: bookData.author || '未知作者',
        description: bookData.description,
        sourceType: 'opds',
        sourceUrl: bookData.sourceUrl,
        opdsConfigId: opdsConfigId,
        language: bookData.language || 'zh',
        categories: bookData.categories || [],
        fileFormat: bookData.fileFormat,
        totalChapters: bookData.totalChapters || 1,
        updateFrequency: bookData.updateFrequency || 60,
        isActive: true,
      });

      return {
        success: true,
        data: book,
        message: "从OPDS添加书籍成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `从OPDS添加书籍失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 上传书籍文件
   */
  async uploadBook(file: Express.Multer.File, metadata: Partial<BookInterface>) {
    try {
      // 保存文件
      const fileName = `${uuidv4()}_${file.originalname}`;
      const filePath = path.join(this.uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      // 解析章节
      const parseResult = await this.parseBookFile(filePath, file.mimetype);
      
      // 创建书籍记录
      const book = await Book.create({
        title: metadata.title || path.parse(file.originalname).name,
        author: metadata.author || '未知作者',
        description: metadata.description,
        sourceType: 'upload',
        sourcePath: filePath,
        fileFormat: this.getFileFormat(file.mimetype),
        fileSize: file.size,
        totalChapters: parseResult.totalChapters,
        lastChapterTitle: parseResult.lastChapterTitle,
        updateFrequency: metadata.updateFrequency || 60,
        isActive: true,
        ...metadata,
      });

      // 创建章节记录
      if (parseResult.chapters.length > 0) {
        await Chapter.bulkCreate(
          parseResult.chapters.map(chapter => ({
            ...chapter,
            bookId: book.id,
          }))
        );
      }

      return {
        success: true,
        data: book,
        message: "书籍上传成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `书籍上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 解析书籍文件
   */
  private async parseBookFile(filePath: string, mimeType: string): Promise<ChapterParseResult> {
    const fileFormat = this.getFileFormat(mimeType);
    
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
   * 获取文件格式
   */
  private getFileFormat(mimeType: string): string {
    const mimeToFormat: { [key: string]: string } = {
      'text/plain': 'txt',
      'application/epub+zip': 'epub',
      'application/pdf': 'pdf',
    };
    return mimeToFormat[mimeType] || 'txt';
  }
}