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
      console.log('=== 开始书籍上传流程 ===');
      console.log('原始文件信息:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
      
      // 处理文件名编码问题，确保中文字符正确显示
      let originalName = file.originalname;
      console.log('原始文件名字节:', Buffer.from(originalName, 'binary').toString('hex'));
      
      try {
        // 检测文件名是否为乱码，如果是则尝试修复
         if (originalName.includes('\\x') || /[\u00C0-\u00FF]/.test(originalName)) {
          console.log('检测到可能的编码问题，尝试修复...');
          
          // 尝试从latin1转换为utf8
          const buffer = Buffer.from(originalName, 'latin1');
          const utf8Name = buffer.toString('utf8');
          console.log('尝试latin1->utf8转换:', utf8Name);
          
          // 验证转换结果是否合理
          if (utf8Name && !utf8Name.includes('�') && utf8Name.length > 0) {
            originalName = utf8Name;
            console.log('编码修复成功:', originalName);
          } else {
            // 如果转换失败，尝试URL解码
            try {
              originalName = decodeURIComponent(escape(originalName));
              console.log('URL解码成功:', originalName);
            } catch (urlError) {
              console.warn('编码修复失败，使用原始文件名');
            }
          }
        } else {
          // 尝试标准URL解码
          const decoded = decodeURIComponent(originalName);
          if (decoded !== originalName) {
            originalName = decoded;
            console.log('标准URL解码成功:', originalName);
          }
        }
      } catch (e) {
        console.warn('文件名编码处理失败，使用原始文件名:', e);
      }
      
      console.log('最终处理后文件名:', originalName);
      
      // 保存文件
      const fileName = `${uuidv4()}_${originalName}`;
      const filePath = path.join(this.uploadDir, fileName);
      console.log('保存文件路径:', filePath);
      fs.writeFileSync(filePath, file.buffer);
      console.log('文件保存成功');

      // 准备创建书籍记录的数据（不解析章节）
      const bookData = {
        title: metadata.title || path.parse(originalName).name,
        author: metadata.author || '未知作者',
        description: metadata.description,
        coverUrl: metadata.coverUrl,
        sourceType: 'upload' as const,
        sourcePath: filePath,
        sourceUrl: metadata.sourceUrl,
        opdsConfigId: metadata.opdsConfigId,
        language: metadata.language,
        isbn: metadata.isbn,
        categories: metadata.categories || [],
        fileFormat: this.getFileFormat(file.mimetype),
        fileSize: file.size,
        totalChapters: 0, // 初始为0，等待异步解析
        lastChapterTitle: undefined,
        lastChapterTime: undefined,
        updateFrequency: metadata.updateFrequency || 60,
        isActive: metadata.isActive !== undefined ? metadata.isActive : true,
      };
      
      console.log('准备创建书籍记录，数据:', JSON.stringify(bookData, null, 2));
      
      // 创建书籍记录
      const book = await Book.create(bookData);
      console.log('书籍记录创建成功，ID:', book.id, '（章节将在创建RSS配置时异步解析）');

      console.log('=== 书籍上传流程完成 ===');
      console.log('上传成功的书籍:', {
        id: book.id,
        title: book.title,
        author: book.author,
        fileFormat: book.fileFormat,
        fileSize: book.fileSize
      });

      return {
        success: true,
        data: book,
        message: "书籍上传成功",
      };
    } catch (error) {
      console.error('=== 书籍上传失败 ===');
      console.error('错误详情:', {
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      // 如果是数据库验证错误，输出更详细的信息
      if (error instanceof Error && error.name === 'SequelizeValidationError') {
        console.error('数据库验证错误详情:', error);
      }
      
      return {
        success: false,
        error: `书籍上传失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 解析书籍文件
   */
  public async parseBookFile(filePath: string, mimeType: string): Promise<ChapterParseResult> {
    const fileFormat = this.getFileFormat(mimeType);
    
    switch (fileFormat) {
      case 'txt':
        return this.parseTxtFile(filePath);
      case 'epub':
        return this.parseEpubFile(filePath);
      case 'pdf':
        return this.parsePdfFile(filePath);
      default:
        // 对于其他格式，返回基本的章节信息
        return this.parseGenericFile(filePath, fileFormat);
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
   * 解析EPUB文件
   */
  private async parseEpubFile(filePath: string): Promise<ChapterParseResult> {
    try {
      const { EpubParser } = await import('../utils/EpubParser');
      const parser = new EpubParser(filePath);
      const { chapters } = await parser.parse();
      
      if (chapters.length === 0) {
        // 如果没有解析到章节，返回默认章节
        const defaultChapters: Omit<ChapterInterface, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>[] = [
          {
            chapterNumber: 1,
            title: '第一章',
            content: 'EPUB文件已上传，但未能解析到章节内容',
            wordCount: 0,
            publishTime: new Date(),
            isNew: true,
          }
        ];
        
        return {
          totalChapters: 1,
          chapters: defaultChapters,
          lastChapterTitle: '第一章',
        };
      }
      
      return {
        totalChapters: chapters.length,
        chapters,
        lastChapterTitle: chapters[chapters.length - 1]?.title,
      };
    } catch (error) {
      console.error('EPUB解析失败:', error);
      
      // 解析失败时返回默认章节
      const defaultChapters: Omit<ChapterInterface, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>[] = [
        {
          chapterNumber: 1,
          title: '第一章',
          content: `EPUB文件解析失败: ${(error as Error).message}`,
          wordCount: 0,
          publishTime: new Date(),
          isNew: true,
        }
      ];
      
      return {
        totalChapters: 1,
        chapters: defaultChapters,
        lastChapterTitle: '第一章',
      };
    }
  }

  /**
   * 解析PDF文件（基础实现）
   */
  private async parsePdfFile(filePath: string): Promise<ChapterParseResult> {
    // PDF文件的基础处理，暂时返回默认章节信息
    // 后续可以使用pdf-parse库进行完整解析
    const chapters: Omit<ChapterInterface, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>[] = [
      {
        chapterNumber: 1,
        title: '第一章',
        content: 'PDF文件已上传，暂不支持内容解析',
        wordCount: 0,
        publishTime: new Date(),
        isNew: true,
      }
    ];
    
    return {
      totalChapters: 1,
      chapters,
      lastChapterTitle: '第一章',
    };
  }

  /**
   * 解析通用文件格式（基础实现）
   */
  private async parseGenericFile(filePath: string, fileFormat: string): Promise<ChapterParseResult> {
    // 通用文件格式的基础处理，暂时返回默认章节信息
    const chapters: Omit<ChapterInterface, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>[] = [
      {
        chapterNumber: 1,
        title: '第一章',
        content: `${fileFormat.toUpperCase()}文件已上传，暂不支持内容解析`,
        wordCount: 0,
        publishTime: new Date(),
        isNew: true,
      }
    ];
    
    return {
      totalChapters: 1,
      chapters,
      lastChapterTitle: '第一章',
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
      'application/x-mobipocket-ebook': 'mobi',
      'application/vnd.amazon.ebook': 'azw',
    };
    return mimeToFormat[mimeType] || 'unknown';
  }
}