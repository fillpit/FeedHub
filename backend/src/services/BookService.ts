import { injectable } from "inversify";
import { v4 as uuidv4 } from "uuid";
import axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as path from "path";
import Book from "../models/Book";
import Chapter from "../models/Chapter";
import { EpubParser } from "../utils/EpubParser";

import {
  Book as BookInterface,
  Chapter as ChapterInterface,
  ChapterParseResult,
  PaginationParams,
  BookSourceType,
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
      this.uploadDir = path.join(process.cwd(), "uploads", "books");
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
      const { page = 1, limit = 20, sortBy = "updatedAt", sortOrder = "desc" } = params || {};
      const offset = (page - 1) * limit;

      const { count, rows } = await Book.findAndCountAll({
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Chapter,
            as: "chapters",
            attributes: ["id", "chapterNumber", "title", "publishTime", "isNew"],
            limit: 5,
            order: [["chapterNumber", "DESC"]],
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
        error: `获取书籍列表失败: ${error instanceof Error ? error.message : "未知错误"}`,
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
            as: "chapters",
            order: [["chapterNumber", "ASC"]],
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
        error: `获取书籍详情失败: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  /**
   * 从OPDS添加书籍
   */
  async addBookFromOpds(bookData: any, opdsConfigId?: number) {
    try {
      console.log("[BookService.addBookFromOpds] === 开始OPDS书籍添加流程 ===");
      console.log("[BookService.addBookFromOpds] OPDS书籍数据:", JSON.stringify(bookData, null, 2));
      console.log("[BookService.addBookFromOpds] OPDS配置ID:", opdsConfigId);

      // 创建书籍记录
      const bookCreateData = {
        title: bookData.title || "未知标题",
        author: bookData.author || "未知作者",
        description: bookData.description,
        sourceType: "opds" as BookSourceType,
        sourceUrl: bookData.sourceUrl,
        opdsConfigId: opdsConfigId,
        language: bookData.language || "zh",
        categories: bookData.categories || [],
        fileFormat: bookData.fileFormat,
        totalChapters: bookData.totalChapters || 1,
        updateFrequency: bookData.updateFrequency || 60,
        isActive: true,
      };
      console.log("[BookService.addBookFromOpds] === 创建书籍记录 ===");
      console.log(
        "[BookService.addBookFromOpds] 书籍创建数据:",
        JSON.stringify(bookCreateData, null, 2)
      );

      const book = await Book.create(bookCreateData);
      console.log("[BookService.addBookFromOpds] OPDS书籍记录创建成功，书籍ID:", book.id);
      console.log("[BookService.addBookFromOpds] 创建的书籍信息:", {
        id: book.id,
        title: book.title,
        author: book.author,
        sourceType: book.sourceType,
        sourceUrl: book.sourceUrl,
        fileFormat: book.fileFormat,
      });

      // 尝试下载和解析EPUB文件
      console.log("[BookService.addBookFromOpds] === 开始EPUB下载和解析流程 ===");
      let chapters: any[] = [];
      let actualTotalChapters = 1;

      if (bookData.sourceUrl && bookData.fileFormat === "epub") {
        console.log("[BookService.addBookFromOpds] 检测到EPUB文件，开始下载流程");
        console.log("[BookService.addBookFromOpds] 下载URL:", bookData.sourceUrl);
        console.log("[BookService.addBookFromOpds] 文件格式:", bookData.fileFormat);

        try {
          // 构建授权配置
          let authConfig: any = undefined;
          if (opdsConfigId) {
            // 如果有OPDS配置ID，获取配置中的授权信息
            const OpdsConfig = (await import("../models/OpdsConfig")).default;
            const opdsConfig = await OpdsConfig.findByPk(opdsConfigId);
            if (opdsConfig && opdsConfig.authType !== "none") {
              authConfig = {
                username: opdsConfig.username,
                password: opdsConfig.password,
                authType: opdsConfig.authType,
                bearerToken: opdsConfig.bearerToken,
              };
              console.log("[BookService.addBookFromOpds] 使用OPDS配置授权信息，认证类型:", opdsConfig.authType);
            }
          } else {
            // 使用全局OPDS设置
            const GlobalSetting = (await import("../models/GlobalSetting")).default;
            const globalSetting = await GlobalSetting.findOne();
            if (globalSetting && globalSetting.opdsEnabled && globalSetting.opdsUsername) {
              authConfig = {
                username: globalSetting.opdsUsername,
                password: globalSetting.opdsPassword,
                authType: "basic" as const,
              };
              console.log("[BookService.addBookFromOpds] 使用全局OPDS授权信息");
            }
          }

          const downloadResult = await this.downloadEpubFile(bookData.sourceUrl, authConfig);
          console.log("[BookService.addBookFromOpds] EPUB下载结果:", {
            success: downloadResult.success,
            filePath: downloadResult.filePath,
            error: downloadResult.error,
          });

          if (downloadResult.success && downloadResult.filePath) {
            console.log("[BookService.addBookFromOpds] === 开始EPUB文件解析 ===");
            console.log("[BookService.addBookFromOpds] 解析文件路径:", downloadResult.filePath);

            const parser = new EpubParser(downloadResult.filePath);
            const parseResult = await parser.parse();
            console.log("[BookService.addBookFromOpds] EPUB解析结果:", {
              chaptersCount: parseResult.chapters.length,
              metadata: parseResult.metadata,
            });

            // 更新书籍元数据和文件路径
            console.log("[BookService.addBookFromOpds] === 更新书籍元数据 ===");
            const updateData: any = { sourcePath: downloadResult.filePath };

            if (parseResult.metadata.title && parseResult.metadata.title !== book.title) {
              console.log(
                "[BookService.addBookFromOpds] 更新书籍标题:",
                parseResult.metadata.title
              );
              updateData.title = parseResult.metadata.title;
            }
            if (parseResult.metadata.creator && parseResult.metadata.creator !== book.author) {
              console.log(
                "[BookService.addBookFromOpds] 更新书籍作者:",
                parseResult.metadata.creator
              );
              updateData.author = parseResult.metadata.creator;
            }
            if (
              parseResult.metadata.description &&
              parseResult.metadata.description !== book.description
            ) {
              console.log(
                "[BookService.addBookFromOpds] 更新书籍描述长度:",
                parseResult.metadata.description?.length || 0
              );
              updateData.description = parseResult.metadata.description;
            }
            if (parseResult.metadata.language && parseResult.metadata.language !== book.language) {
              console.log(
                "[BookService.addBookFromOpds] 更新书籍语言:",
                parseResult.metadata.language
              );
              updateData.language = parseResult.metadata.language;
            }

            // 创建真实的章节记录
            chapters = parseResult.chapters;
            actualTotalChapters = chapters.length;
            updateData.totalChapters = actualTotalChapters;

            console.log(
              "[BookService.addBookFromOpds] 书籍更新数据:",
              JSON.stringify(updateData, null, 2)
            );

            // 批量更新书籍信息
            await book.update(updateData);
            console.log("[BookService.addBookFromOpds] 书籍信息更新完成");

            console.log(
              "[BookService.addBookFromOpds] EPUB解析成功，共",
              actualTotalChapters,
              "个章节，文件已保存到:",
              downloadResult.filePath
            );
          } else {
            console.warn(
              "[BookService.addBookFromOpds] EPUB文件下载失败，将使用默认章节:",
              downloadResult.error
            );
          }
        } catch (parseError) {
          console.error("[BookService.addBookFromOpds] EPUB文件解析异常，将使用默认章节:", {
            message: parseError instanceof Error ? parseError.message : "未知错误",
            stack: parseError instanceof Error ? parseError.stack : undefined,
          });
        }
      } else {
        console.log("[BookService.addBookFromOpds] 跳过EPUB下载，原因:", {
          hasSourceUrl: !!bookData.sourceUrl,
          fileFormat: bookData.fileFormat,
          isEpub: bookData.fileFormat === "epub",
        });
      }

      // 如果没有解析到章节或解析失败，创建默认章节
      console.log("[BookService.addBookFromOpds] === 创建章节记录 ===");
      if (chapters.length === 0) {
        console.log("[BookService.addBookFromOpds] 无解析章节，创建默认章节");

        const defaultContent =
          book.description ||
          `《${book.title}》\n\n作者：${book.author}\n\n这是一本来自OPDS服务的电子书。完整内容请访问原始链接获取。\n\n原始链接：${book.sourceUrl || "暂无"}`;
        const chapterData = {
          bookId: book.id,
          chapterNumber: 1,
          title: book.title,
          content: defaultContent,
          wordCount: defaultContent.length,
          publishTime: new Date(),
          isNew: false,
        };

        console.log("[BookService.addBookFromOpds] 默认章节数据:", {
          bookId: chapterData.bookId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          contentLength: chapterData.content.length,
          wordCount: chapterData.wordCount,
        });

        const chapter = await Chapter.create(chapterData);
        console.log("[BookService.addBookFromOpds] OPDS书籍默认章节创建成功，章节ID:", chapter.id);
      } else {
        console.log("[BookService.addBookFromOpds] 批量创建解析出的章节，数量:", chapters.length);
        console.log(
          "[BookService.addBookFromOpds] 章节预览:",
          chapters.slice(0, 3).map((ch, i) => ({
            chapterNumber: i + 1,
            title: ch.title,
            contentLength: ch.content?.length || 0,
            wordCount: ch.wordCount,
          }))
        );

        // 批量创建解析出的章节
        for (let i = 0; i < chapters.length; i++) {
          const chapterData = {
            bookId: book.id,
            chapterNumber: i + 1,
            title: chapters[i].title,
            content: chapters[i].content,
            wordCount: chapters[i].wordCount,
            publishTime: chapters[i].publishTime || new Date(),
            isNew: false,
          };

          await Chapter.create(chapterData);
        }
        console.log("[BookService.addBookFromOpds] 成功创建", chapters.length, "个章节记录");
      }

      console.log("[BookService.addBookFromOpds] === OPDS书籍添加流程完成 ===");
      console.log("[BookService.addBookFromOpds] 添加成功的OPDS书籍:", {
        id: book.id,
        title: book.title,
        author: book.author,
        sourceUrl: book.sourceUrl,
        fileFormat: book.fileFormat,
        totalChapters: actualTotalChapters,
        chaptersCount: chapters.length || 1,
        sourcePath: book.sourcePath,
      });

      return {
        success: true,
        data: book,
        message: "从OPDS添加书籍成功",
      };
    } catch (error) {
      console.error("[BookService.addBookFromOpds] === OPDS书籍添加失败 ===");
      console.error("[BookService.addBookFromOpds] 错误详情:", {
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      return {
        success: false,
        error: `从OPDS添加书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  /**
   * 上传书籍文件
   */
  async uploadBook(file: Express.Multer.File, metadata: Partial<BookInterface>) {
    try {
      console.log("=== 开始书籍上传流程 ===");
      console.log("原始文件信息:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      // 处理文件名编码问题，确保中文字符正确显示
      let originalName = file.originalname;
      console.log("原始文件名字节:", Buffer.from(originalName, "binary").toString("hex"));

      try {
        // 检测文件名是否为乱码，如果是则尝试修复
        if (originalName.includes("\\x") || /[\u00C0-\u00FF]/.test(originalName)) {
          console.log("检测到可能的编码问题，尝试修复...");

          // 尝试从latin1转换为utf8
          const buffer = Buffer.from(originalName, "latin1");
          const utf8Name = buffer.toString("utf8");
          console.log("尝试latin1->utf8转换:", utf8Name);

          // 验证转换结果是否合理
          if (utf8Name && !utf8Name.includes("�") && utf8Name.length > 0) {
            originalName = utf8Name;
            console.log("编码修复成功:", originalName);
          } else {
            // 如果转换失败，尝试URL解码
            try {
              originalName = decodeURIComponent(escape(originalName));
              console.log("URL解码成功:", originalName);
            } catch (urlError) {
              console.warn("编码修复失败，使用原始文件名");
            }
          }
        } else {
          // 尝试标准URL解码
          const decoded = decodeURIComponent(originalName);
          if (decoded !== originalName) {
            originalName = decoded;
            console.log("标准URL解码成功:", originalName);
          }
        }
      } catch (e) {
        console.warn("文件名编码处理失败，使用原始文件名:", e);
      }

      console.log("最终处理后文件名:", originalName);

      // 保存文件
      const fileName = `${uuidv4()}_${originalName}`;
      const filePath = path.join(this.uploadDir, fileName);
      console.log("保存文件路径:", filePath);
      fs.writeFileSync(filePath, file.buffer);
      console.log("文件保存成功");

      // 准备创建书籍记录的数据（不解析章节）
      const bookData = {
        title: metadata.title || path.parse(originalName).name,
        author: metadata.author || "未知作者",
        description: metadata.description,
        coverUrl: metadata.coverUrl,
        sourceType: "upload" as const,
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

      console.log("准备创建书籍记录，数据:", JSON.stringify(bookData, null, 2));

      // 创建书籍记录
      const book = await Book.create(bookData);
      console.log("书籍记录创建成功，ID:", book.id, "（章节将在创建RSS配置时异步解析）");

      console.log("=== 书籍上传流程完成 ===");
      console.log("上传成功的书籍:", {
        id: book.id,
        title: book.title,
        author: book.author,
        fileFormat: book.fileFormat,
        fileSize: book.fileSize,
      });

      return {
        success: true,
        data: book,
        message: "书籍上传成功",
      };
    } catch (error) {
      console.error("=== 书籍上传失败 ===");
      console.error("错误详情:", {
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      // 如果是数据库验证错误，输出更详细的信息
      if (error instanceof Error && error.name === "SequelizeValidationError") {
        console.error("数据库验证错误详情:", error);
      }

      return {
        success: false,
        error: `书籍上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  /**
   * 解析书籍文件
   */
  public async parseBookFile(filePath: string, mimeType: string): Promise<ChapterParseResult> {
    const fileFormat = this.getFileFormat(mimeType);
    // 输出格式信息
    console.log("文件格式:", fileFormat);

    switch (fileFormat) {
      case "epub":
        return this.parseEpubFile(filePath);
      case "pdf":
        return this.parsePdfFile(filePath);
      default:
        // 对于其他格式，返回基本的章节信息
        return this.parseGenericFile(filePath, fileFormat);
    }
  }

  /**
   * 解析EPUB文件
   */
  private async parseEpubFile(filePath: string): Promise<ChapterParseResult> {
    try {
      const { EpubParser } = await import("../utils/EpubParser");
      const parser = new EpubParser(filePath);
      const { chapters } = await parser.parse();

      if (chapters.length === 0) {
        // 如果没有解析到章节，返回默认章节
        const defaultChapters: Omit<
          ChapterInterface,
          "id" | "bookId" | "createdAt" | "updatedAt"
        >[] = [
          {
            chapterNumber: 1,
            title: "第一章",
            content: "EPUB文件已上传，但未能解析到章节内容",
            wordCount: 0,
            publishTime: new Date(),
            isNew: true,
          },
        ];

        return {
          totalChapters: 1,
          chapters: defaultChapters,
          lastChapterTitle: "第一章",
        };
      }

      return {
        totalChapters: chapters.length,
        chapters,
        lastChapterTitle: chapters[chapters.length - 1]?.title,
      };
    } catch (error) {
      console.error("EPUB解析失败:", error);

      // 解析失败时返回默认章节
      const defaultChapters: Omit<ChapterInterface, "id" | "bookId" | "createdAt" | "updatedAt">[] =
        [
          {
            chapterNumber: 1,
            title: "第一章",
            content: `EPUB文件解析失败: ${(error as Error).message}`,
            wordCount: 0,
            publishTime: new Date(),
            isNew: true,
          },
        ];

      return {
        totalChapters: 1,
        chapters: defaultChapters,
        lastChapterTitle: "第一章",
      };
    }
  }

  /**
   * 解析PDF文件
   */
  private async parsePdfFile(filePath: string): Promise<ChapterParseResult> {
    try {
      const { PdfParser } = await import("../utils/PdfParser");
      const parser = new PdfParser(filePath);
      const { chapters } = await parser.parse();

      if (chapters.length === 0) {
        // 如果没有解析到章节，返回默认章节
        const defaultChapters: Omit<
          ChapterInterface,
          "id" | "bookId" | "createdAt" | "updatedAt"
        >[] = [
          {
            chapterNumber: 1,
            title: "第一章",
            content: "PDF文件已上传，但未能解析到章节内容",
            wordCount: 0,
            publishTime: new Date(),
            isNew: true,
          },
        ];

        return {
          totalChapters: 1,
          chapters: defaultChapters,
          lastChapterTitle: "第一章",
        };
      }

      return {
        totalChapters: chapters.length,
        chapters,
        lastChapterTitle: chapters[chapters.length - 1]?.title,
      };
    } catch (error) {
      console.error("PDF解析失败:", error);

      // 解析失败时返回默认章节
      const defaultChapters: Omit<ChapterInterface, "id" | "bookId" | "createdAt" | "updatedAt">[] =
        [
          {
            chapterNumber: 1,
            title: "第一章",
            content: `PDF文件解析失败: ${(error as Error).message}`,
            wordCount: 0,
            publishTime: new Date(),
            isNew: true,
          },
        ];

      return {
        totalChapters: 1,
        chapters: defaultChapters,
        lastChapterTitle: "第一章",
      };
    }
  }

  /**
   * 解析通用文件格式
   */
  private async parseGenericFile(
    filePath: string,
    fileFormat: string
  ): Promise<ChapterParseResult> {
    try {
      // 获取文件基本信息
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // 根据文件格式提供不同的处理
      let content = "";
      let title = "第一章";

      switch (fileFormat.toLowerCase()) {
        case "mobi":
        case "azw":
        case "azw3":
          content = `Kindle格式电子书已上传成功。\n\n文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n\n该格式暂不支持内容解析，但文件已保存并可用于RSS订阅。建议使用EPUB或PDF格式以获得更好的解析效果。`;
          title = "Kindle电子书";
          break;
        case "chm":
          content = `CHM帮助文档已上传成功。\n\n文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n\n该格式暂不支持内容解析，但文件已保存。`;
          title = "CHM文档";
          break;
        case "fb2":
          content = `FictionBook格式电子书已上传成功。\n\n文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n\n该格式暂不支持内容解析，但文件已保存。`;
          title = "FictionBook电子书";
          break;
        default:
          content = `${fileFormat.toUpperCase()}格式文件已上传成功。\n\n文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n\n该格式暂不支持内容解析，但文件已保存。\n\n支持完整解析的格式：EPUB、PDF`;
          title = `${fileFormat.toUpperCase()}文件`;
      }

      const chapters: Omit<ChapterInterface, "id" | "bookId" | "createdAt" | "updatedAt">[] = [
        {
          chapterNumber: 1,
          title: title,
          content: content,
          wordCount: content.length,
          publishTime: new Date(),
          isNew: true,
        },
      ];

      return {
        totalChapters: 1,
        chapters,
        lastChapterTitle: title,
      };
    } catch (error) {
      console.error(`解析${fileFormat}文件失败:`, error);

      // 解析失败时返回默认章节
      const defaultChapters: Omit<ChapterInterface, "id" | "bookId" | "createdAt" | "updatedAt">[] =
        [
          {
            chapterNumber: 1,
            title: "文件上传成功",
            content: `${fileFormat.toUpperCase()}文件已上传，但处理过程中出现错误: ${(error as Error).message}`,
            wordCount: 0,
            publishTime: new Date(),
            isNew: true,
          },
        ];

      return {
        totalChapters: 1,
        chapters: defaultChapters,
        lastChapterTitle: "文件上传成功",
      };
    }
  }

  /**
   * 删除书籍
   */
  async deleteBook(id: number) {
    try {
      const book = await Book.findByPk(id);
      if (!book) {
        return {
          success: false,
          error: `未找到ID为${id}的书籍`,
        };
      }

      // 删除相关章节
      await Chapter.destroy({ where: { bookId: id } });

      // 删除书籍文件（如果存在）
      if (book.sourcePath && fs.existsSync(book.sourcePath)) {
        try {
          fs.unlinkSync(book.sourcePath);
          console.log(`已删除书籍文件: ${book.sourcePath}`);
        } catch (fileError) {
          console.warn(`删除书籍文件失败: ${fileError}`);
          // 文件删除失败不影响数据库删除
        }
      }

      // 删除书籍记录
      await Book.destroy({ where: { id } });

      return {
        success: true,
        data: undefined,
        message: "书籍删除成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `删除书籍失败: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  /**
   * 获取文件格式
   */
  private getFileFormat(mimeType: string): string {
    const mimeToFormat: { [key: string]: string } = {
      "application/epub+zip": "epub",
      "application/pdf": "pdf",
      "application/x-mobipocket-ebook": "mobi",
      "application/vnd.amazon.ebook": "azw",
      "application/x-kindle-application": "azw3",
      "application/vnd.ms-htmlhelp": "chm",
      "application/x-fictionbook+xml": "fb2",
      "application/x-dtbncx+xml": "ncx",
    };
    return mimeToFormat[mimeType] || "unknown";
  }

  /**
   * 重新下载和解析OPDS书籍的EPUB文件
   */
  async redownloadAndParseOpdsBook(bookId: number): Promise<{
    success: boolean;
    chapters?: any[];
    totalChapters?: number;
    lastChapterTitle?: string;
    filePath?: string;
    error?: string;
  }> {
    try {
      console.log("[BookService.redownloadAndParseOpdsBook] === 开始重新下载和解析OPDS书籍 ===");
      console.log("[BookService.redownloadAndParseOpdsBook] 书籍ID:", bookId);

      const book = await Book.findByPk(bookId);
      if (!book) {
        console.error("[BookService.redownloadAndParseOpdsBook] 书籍不存在，ID:", bookId);
        return {
          success: false,
          error: `未找到ID为${bookId}的书籍`,
        };
      }

      console.log("[BookService.redownloadAndParseOpdsBook] 书籍信息:", {
        id: book.id,
        title: book.title,
        author: book.author,
        sourceType: book.sourceType,
        sourceUrl: book.sourceUrl,
        fileFormat: book.fileFormat,
      });

      if (book.sourceType !== "opds" || !book.sourceUrl || book.fileFormat !== "epub") {
        console.error("[BookService.redownloadAndParseOpdsBook] 书籍类型不符合要求:", {
          sourceType: book.sourceType,
          hasSourceUrl: !!book.sourceUrl,
          fileFormat: book.fileFormat,
        });
        return {
          success: false,
          error: "书籍不是OPDS EPUB类型，无法重新下载",
        };
      }

      console.log("[BookService.redownloadAndParseOpdsBook] === 开始重新下载EPUB文件 ===");
      console.log("[BookService.redownloadAndParseOpdsBook] 下载URL:", book.sourceUrl);

      // 构建授权配置
      let authConfig: any = undefined;
      if (book.opdsConfigId) {
        // 如果有OPDS配置ID，获取配置中的授权信息
        const OpdsConfig = (await import("../models/OpdsConfig")).default;
        const opdsConfig = await OpdsConfig.findByPk(book.opdsConfigId);
        if (opdsConfig && opdsConfig.authType !== "none") {
          authConfig = {
            username: opdsConfig.username,
            password: opdsConfig.password,
            authType: opdsConfig.authType,
            bearerToken: opdsConfig.bearerToken,
          };
          console.log("[BookService.redownloadAndParseOpdsBook] 使用OPDS配置授权信息，认证类型:", opdsConfig.authType);
        }
      } else {
        // 使用全局OPDS设置
        const GlobalSetting = (await import("../models/GlobalSetting")).default;
        const globalSetting = await GlobalSetting.findOne();
        if (globalSetting && globalSetting.opdsEnabled && globalSetting.opdsUsername) {
          authConfig = {
            username: globalSetting.opdsUsername,
            password: globalSetting.opdsPassword,
            authType: "basic" as const,
          };
          console.log("[BookService.redownloadAndParseOpdsBook] 使用全局OPDS授权信息");
        }
      }

      const downloadResult = await this.downloadEpubFile(book.sourceUrl, authConfig);
      console.log("[BookService.redownloadAndParseOpdsBook] 下载结果:", {
        success: downloadResult.success,
        filePath: downloadResult.filePath,
        error: downloadResult.error,
      });

      if (downloadResult.success && downloadResult.filePath) {
        console.log("[BookService.redownloadAndParseOpdsBook] === 开始解析EPUB文件 ===");
        console.log(
          "[BookService.redownloadAndParseOpdsBook] 解析文件路径:",
          downloadResult.filePath
        );

        const parser = new EpubParser(downloadResult.filePath);
        const parseResult = await parser.parse();
        console.log("[BookService.redownloadAndParseOpdsBook] 解析结果:", {
          chaptersCount: parseResult.chapters.length,
          metadata: parseResult.metadata,
        });

        if (parseResult.chapters.length > 0) {
          console.log("[BookService.redownloadAndParseOpdsBook] === 解析成功 ===");
          console.log(
            "[BookService.redownloadAndParseOpdsBook] 章节预览:",
            parseResult.chapters.slice(0, 3).map((ch, i) => ({
              chapterNumber: i + 1,
              title: ch.title,
              contentLength: ch.content?.length || 0,
              wordCount: ch.wordCount,
            }))
          );

          const result = {
            success: true,
            chapters: parseResult.chapters,
            totalChapters: parseResult.chapters.length,
            lastChapterTitle: parseResult.chapters[parseResult.chapters.length - 1]?.title,
            filePath: downloadResult.filePath,
          };

          console.log("[BookService.redownloadAndParseOpdsBook] 返回结果:", {
            success: result.success,
            chaptersCount: result.chapters?.length,
            totalChapters: result.totalChapters,
            lastChapterTitle: result.lastChapterTitle,
            filePath: result.filePath,
          });

          return result;
        } else {
          console.warn("[BookService.redownloadAndParseOpdsBook] EPUB文件解析成功但未找到章节内容");
          return {
            success: false,
            error: "EPUB文件解析成功但未找到章节内容",
          };
        }
      } else {
        console.error(
          "[BookService.redownloadAndParseOpdsBook] EPUB文件下载失败:",
          downloadResult.error
        );
        return {
          success: false,
          error: downloadResult.error || "EPUB文件下载失败",
        };
      }
    } catch (error) {
      console.error("[BookService.redownloadAndParseOpdsBook] === 重新下载和解析OPDS书籍异常 ===");
      console.error("[BookService.redownloadAndParseOpdsBook] 错误详情:", {
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      return {
        success: false,
        error: `重新下载和解析失败: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  /**
   * 下载EPUB文件到临时目录
   */
  private async downloadEpubFile(url: string, authConfig?: {
    username?: string;
    password?: string;
    authType?: "none" | "basic" | "bearer";
    bearerToken?: string;
  }): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> {
    try {
      console.log("[BookService.downloadEpubFile] === 开始下载EPUB文件 ===");
      console.log("[BookService.downloadEpubFile] 下载URL:", url);
      console.log("[BookService.downloadEpubFile] 请求配置: 超时60秒，响应类型stream");

      // 构建请求配置，包含授权信息
      const requestConfig: any = {
        method: "GET",
        url: url,
        responseType: "stream",
        timeout: 60000, // 60秒超时
      };

      // 添加授权信息
      if (authConfig) {
        if (authConfig.authType === "basic" && authConfig.username && authConfig.password) {
          requestConfig.auth = {
            username: authConfig.username,
            password: authConfig.password,
          };
          console.log("[BookService.downloadEpubFile] 使用Basic认证，用户名:", authConfig.username);
        } else if (authConfig.authType === "bearer" && authConfig.bearerToken) {
          requestConfig.headers = {
            Authorization: `Bearer ${authConfig.bearerToken}`,
          };
          console.log("[BookService.downloadEpubFile] 使用Bearer认证");
        }
      }

      const response = await this.axiosInstance(requestConfig);

      console.log("[BookService.downloadEpubFile] HTTP响应状态:", response.status);
      console.log("[BookService.downloadEpubFile] 响应头:", {
        contentType: response.headers["content-type"],
        contentLength: response.headers["content-length"],
        contentDisposition: response.headers["content-disposition"],
      });

      // 创建文件名，保存到uploads/books目录
      const fileName = `opds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.epub`;
      const filePath = path.join(this.uploadDir, fileName);

      console.log("[BookService.downloadEpubFile] === 保存文件 ===");
      console.log("[BookService.downloadEpubFile] 生成文件名:", fileName);
      console.log("[BookService.downloadEpubFile] 保存路径:", filePath);
      console.log("[BookService.downloadEpubFile] 上传目录:", this.uploadDir);

      // 确保目录存在
      this.ensureUploadDir();

      // 写入文件
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          console.log("[BookService.downloadEpubFile] === EPUB文件下载完成 ===");
          console.log("[BookService.downloadEpubFile] 文件保存路径:", filePath);

          // 检查文件大小
          try {
            const stats = fs.statSync(filePath);
            console.log("[BookService.downloadEpubFile] 文件大小:", stats.size, "字节");
          } catch (statError) {
            console.warn("[BookService.downloadEpubFile] 无法获取文件大小:", statError);
          }

          resolve({
            success: true,
            filePath: filePath,
          });
        });

        writer.on("error", (error) => {
          console.error("[BookService.downloadEpubFile] EPUB文件写入失败:", {
            message: error.message,
            code: (error as any).code,
            path: (error as any).path,
          });
          resolve({
            success: false,
            error: `文件写入失败: ${error.message}`,
          });
        });

        response.data.on("error", (error: any) => {
          console.error("[BookService.downloadEpubFile] EPUB文件下载流错误:", {
            message: error.message,
            code: error.code,
          });
          resolve({
            success: false,
            error: `下载失败: ${error.message}`,
          });
        });
      });
    } catch (error) {
      console.error("[BookService.downloadEpubFile] === 下载EPUB文件异常 ===");
      console.error("[BookService.downloadEpubFile] 错误详情:", {
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        code: (error as any).code,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
      });

      return {
        success: false,
        error: `下载失败: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }
}