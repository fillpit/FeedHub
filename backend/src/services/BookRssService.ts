import { injectable, inject } from "inversify";
import { ApiResponseData } from "../utils/apiResponse";
import BookRssConfig from "../models/BookRssConfigModel";
import {
  BookRssConfigAttributes,
  BookRssConfigCreationAttributes,
} from "../models/BookRssConfigModel";
import GlobalSetting from "../models/GlobalSetting";
import {
  BookRssConfig as BookRssConfigInterface,
  Book,
  Chapter,
} from "@feedhub/shared/src/types/bookRss";
import { OpdsService } from "./OpdsService";
import { ChapterService } from "./ChapterService";
import { BookService } from "./BookService";
import BookModel from "../models/Book";
import ChapterModel from "../models/Chapter";
import { TYPES } from "../core/types";

@injectable()
export class BookRssService {
  constructor(
    @inject(TYPES.OpdsService) private opdsService: OpdsService,
    @inject(TYPES.ChapterService) private chapterService: ChapterService,
    @inject(TYPES.BookService) private bookService: BookService
  ) {}
  /**
   * 获取所有图书RSS配置
   */
  async getAllConfigs(): Promise<ApiResponseData<BookRssConfigInterface[]>> {
    try {
      console.log("[BookRssService] 开始获取所有图书RSS配置");

      console.log("[BookRssService] 查询BookRssConfig数据...");
      const configs = await BookRssConfig.findAll({
        include: [
          {
            model: BookModel,
            as: "book",
            attributes: [
              "id",
              "title",
              "author",
              "totalChapters",
              "description",
              "sourceType",
              "opdsConfigId",
            ],
            required: false,
          },
        ],
      });
      console.log(`[BookRssService] 查询到 ${configs.length} 个配置`);

      console.log("[BookRssService] 查询全局设置...");
      const globalSetting = await GlobalSetting.findOne();
      console.log(`[BookRssService] 全局设置查询完成: ${globalSetting ? "存在" : "不存在"}`);

      console.log("[BookRssService] 开始处理配置数据...");
      // 将全局OPDS设置注入到每个配置中，并添加书籍信息
      const configsWithGlobalOpds = configs.map((config, index) => {
        console.log(`[BookRssService] 处理配置 ${index + 1}/${configs.length}, ID: ${config.id}`);

        const configData = config.toJSON() as any;
        console.log(
          `[BookRssService] 配置 ${config.id} 原始数据:`,
          JSON.stringify(configData, null, 2)
        );

        configData.opdsConfig = {
          name: "Global OPDS",
          url: globalSetting?.opdsServerUrl || "",
          username: globalSetting?.opdsUsername || "",
          password: globalSetting?.opdsPassword || "",
          authType: "basic" as const,
          enabled: globalSetting?.opdsEnabled || false,
        };

        // 添加书籍信息
        if (configData.book) {
          console.log(`[BookRssService] 配置 ${config.id} 包含书籍信息:`, configData.book);
          configData.bookInfo = {
            id: configData.book.id,
            title: configData.book.title,
            author: configData.book.author,
            totalChapters: configData.book.totalChapters,
            sourceType: configData.book.sourceType,
            opdsConfigId: configData.book.opdsConfigId,
          };
        } else {
          console.log(`[BookRssService] 配置 ${config.id} 不包含书籍信息`);
        }

        console.log(
          `[BookRssService] 配置 ${config.id} 处理后数据:`,
          JSON.stringify(configData, null, 2)
        );
        return configData;
      });

      console.log(`[BookRssService] 所有配置处理完成，返回 ${configsWithGlobalOpds.length} 个配置`);
      return { success: true, data: configsWithGlobalOpds, message: "获取图书RSS配置列表成功" };
    } catch (error: any) {
      console.error("[BookRssService] getAllConfigs 发生错误:", error);
      console.error("[BookRssService] 错误堆栈:", error.stack);
      throw error;
    }
  }

  /**
   * 根据ID获取配置
   */
  async getConfigById(id: number): Promise<ApiResponseData<BookRssConfigInterface>> {
    const config = await BookRssConfig.findByPk(id, {
      include: [
        {
          model: BookModel,
          as: "book",
          attributes: [
            "id",
            "title",
            "author",
            "totalChapters",
            "description",
            "sourceType",
            "opdsConfigId",
          ],
          required: false,
        },
      ],
    });
    if (!config) throw new Error(`未找到ID为${id}的图书RSS配置`);

    const globalSetting = await GlobalSetting.findOne();
    const configData = config.toJSON() as any;

    // 注入全局OPDS设置
    configData.opdsConfig = {
      name: "Global OPDS",
      url: globalSetting?.opdsServerUrl || "",
      username: globalSetting?.opdsUsername || "",
      password: globalSetting?.opdsPassword || "",
      authType: "basic" as const,
      enabled: globalSetting?.opdsEnabled || false,
    };

    // 添加书籍信息
    if (configData.book) {
      configData.bookInfo = {
        id: configData.book.id,
        title: configData.book.title,
        author: configData.book.author,
        totalChapters: configData.book.totalChapters,
        sourceType: configData.book.sourceType,
        opdsConfigId: configData.book.opdsConfigId,
      };
    }

    return { success: true, data: configData, message: "获取图书RSS配置成功" };
  }

  /**
   * 添加新的图书RSS配置
   */
  async addConfig(
    configData: Omit<BookRssConfigInterface, "id" | "createdAt" | "updatedAt" | "opdsConfig">,
    opdsBook?: any
  ): Promise<ApiResponseData<BookRssConfigInterface>> {
    console.log("[BookRssService.addConfig] === 开始添加图书RSS配置 ===");
    console.log("[BookRssService.addConfig] 配置数据:", JSON.stringify(configData, null, 2));
    console.log(
      "[BookRssService.addConfig] OPDS书籍数据:",
      opdsBook ? JSON.stringify(opdsBook, null, 2) : "无"
    );

    // 生成唯一的key
    const key = configData.key || `book-rss-${Date.now()}`;
    console.log("[BookRssService.addConfig] 生成配置key:", key);

    let bookId = configData.bookId;

    // 如果提供了OPDS书籍数据，先创建书籍记录
    if (opdsBook) {
      console.log("[BookRssService.addConfig] === 开始OPDS书籍创建流程 ===");
      console.log("[BookRssService.addConfig] OPDS书籍详细信息:", {
        title: opdsBook.title,
        author: opdsBook.author,
        description: opdsBook.description,
        sourceUrl: opdsBook.link,
        language: opdsBook.language || "zh",
        categories: opdsBook.categories || [],
        fileFormat: opdsBook.fileFormat || "epub",
        totalChapters: opdsBook.totalChapters || 1,
        updateFrequency: 60,
      });

      const bookResult = await this.bookService.addBookFromOpds({
        title: opdsBook.title,
        author: opdsBook.author,
        description: opdsBook.description,
        sourceUrl: opdsBook.link,
        language: opdsBook.language || "zh",
        categories: opdsBook.categories || [],
        fileFormat: opdsBook.fileFormat || "epub",
        totalChapters: opdsBook.totalChapters || 1,
        updateFrequency: 60,
      });

      if (bookResult.success && bookResult.data) {
        bookId = bookResult.data.id;
        console.log("[BookRssService.addConfig] OPDS书籍创建成功，书籍ID:", bookId);
        console.log(
          "[BookRssService.addConfig] 创建的书籍信息:",
          JSON.stringify(bookResult.data, null, 2)
        );
      } else {
        console.error("[BookRssService.addConfig] OPDS书籍创建失败，错误信息:", bookResult.error);
        throw new Error(`创建OPDS书籍失败: ${bookResult.error}`);
      }
    }

    console.log("[BookRssService.addConfig] === 创建RSS配置记录 ===");
    const configToCreate = {
      ...configData,
      key,
      bookId,
      opdsConfig: {
        name: "",
        url: "",
        authType: "none" as const,
        enabled: false,
      }, // 占位符，实际使用全局设置
      // 确保新字段被正确保存
      includeContent: configData.includeContent || false,
      parseStatus: "pending" as const,
    };
    console.log(
      "[BookRssService.addConfig] 即将创建的配置:",
      JSON.stringify(configToCreate, null, 2)
    );

    const newConfig = await BookRssConfig.create(configToCreate);
    console.log("[BookRssService.addConfig] RSS配置创建成功，配置ID:", newConfig.id);

    // 如果配置了书籍ID，触发异步章节解析
    if (bookId) {
      console.log(
        "[BookRssService.addConfig] 触发异步章节解析，配置ID:",
        newConfig.id,
        "书籍ID:",
        bookId
      );
      this.parseBookChaptersAsync(newConfig.id, bookId);
    } else {
      console.log("[BookRssService.addConfig] 无书籍ID，跳过章节解析");
    }

    console.log("[BookRssService.addConfig] === 获取全局OPDS设置 ===");
    const globalSetting = await GlobalSetting.findOne();
    console.log(
      "[BookRssService.addConfig] 全局设置:",
      globalSetting
        ? {
            opdsServerUrl: globalSetting.opdsServerUrl,
            opdsUsername: globalSetting.opdsUsername ? "***" : undefined,
            opdsEnabled: globalSetting.opdsEnabled,
          }
        : "无全局设置"
    );

    const configWithGlobalOpds = newConfig.toJSON() as BookRssConfigInterface;

    // 注入全局OPDS设置
    configWithGlobalOpds.opdsConfig = {
      name: "Global OPDS",
      url: globalSetting?.opdsServerUrl || "",
      username: globalSetting?.opdsUsername || "",
      password: globalSetting?.opdsPassword || "",
      authType: "basic" as const,
      enabled: globalSetting?.opdsEnabled || false,
    };

    console.log("[BookRssService.addConfig] === 图书RSS配置添加完成 ===");
    console.log(
      "[BookRssService.addConfig] 最终配置:",
      JSON.stringify(
        {
          id: configWithGlobalOpds.id,
          title: configWithGlobalOpds.title,
          key: configWithGlobalOpds.key,
          bookId: configWithGlobalOpds.bookId,
          parseStatus: configWithGlobalOpds.parseStatus,
        },
        null,
        2
      )
    );

    return { success: true, data: configWithGlobalOpds, message: "图书RSS配置添加成功" };
  }

  /**
   * 更新图书RSS配置
   */
  async updateConfig(
    id: number,
    configData: Partial<Omit<BookRssConfigInterface, "opdsConfig">>
  ): Promise<ApiResponseData<BookRssConfigInterface>> {
    const config = await BookRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的图书RSS配置`);

    // 确保新字段被正确更新
    const updateData = {
      ...configData,
      bookId: configData.bookId,
      includeContent: configData.includeContent,
    };

    // 检查是否更新了bookId
    const oldBookId = config.bookId;
    const newBookId = configData.bookId;

    await config.update(updateData);

    // 如果bookId发生变化且新的bookId存在，触发异步章节解析
    if (newBookId && newBookId !== oldBookId) {
      this.parseBookChaptersAsync(id, newBookId);
    }

    const globalSetting = await GlobalSetting.findOne();
    const updatedConfigData = config.toJSON() as BookRssConfigInterface;

    // 注入全局OPDS设置
    updatedConfigData.opdsConfig = {
      name: "Global OPDS",
      url: globalSetting?.opdsServerUrl || "",
      username: globalSetting?.opdsUsername || "",
      password: globalSetting?.opdsPassword || "",
      authType: "basic" as const,
      enabled: globalSetting?.opdsEnabled || false,
    };

    return { success: true, data: updatedConfigData, message: "图书RSS配置更新成功" };
  }

  /**
   * 删除图书RSS配置
   */
  async deleteConfig(id: number): Promise<ApiResponseData<void>> {
    const config = await BookRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的图书RSS配置`);

    // 如果配置关联了书籍，删除相关的书籍和章节信息
    if (config.bookId) {
      try {
        // 调用BookService删除书籍（包括章节和文件）
        const deleteResult = await this.bookService.deleteBook(config.bookId);
        if (!deleteResult.success) {
          console.warn(`删除关联书籍失败: ${deleteResult.error}`);
          // 即使书籍删除失败，也继续删除RSS配置
        }
      } catch (error) {
        console.warn(`删除关联书籍时发生错误: ${error}`);
        // 即使书籍删除失败，也继续删除RSS配置
      }
    }

    // 删除RSS配置
    await BookRssConfig.destroy({ where: { id } });
    return { success: true, data: undefined, message: "图书RSS配置删除成功" };
  }

  /**
   * 刷新配置（手动更新图书列表）
   */
  async refreshConfig(id: number): Promise<ApiResponseData<BookRssConfigInterface>> {
    console.log("[BookRssService.refreshConfig] === 开始刷新图书RSS配置 ===");
    console.log("[BookRssService.refreshConfig] 配置ID:", id);

    const config = await BookRssConfig.findByPk(id, {
      include: [
        {
          model: BookModel,
          as: "book",
          attributes: [
            "id",
            "title",
            "author",
            "sourceType",
            "sourceUrl",
            "fileFormat",
            "parseStatus",
          ],
        },
      ],
    });

    if (!config) {
      console.error("[BookRssService.refreshConfig] 配置不存在，ID:", id);
      throw new Error(`未找到ID为${id}的图书RSS配置`);
    }

    console.log("[BookRssService.refreshConfig] 找到配置:", {
      id: config.id,
      title: config.title,
      bookId: config.bookId,
      parseStatus: config.parseStatus,
      lastUpdateTime: config.lastUpdateTime,
    });

    // 如果是OPDS书籍且有bookId，检查是否需要重新解析
    const associatedBook = (config as any).book;
    if (config.bookId && associatedBook && associatedBook.sourceType === "opds") {
      console.log("[BookRssService.refreshConfig] === OPDS书籍刷新流程 ===");
      console.log("[BookRssService.refreshConfig] OPDS书籍信息:", {
        bookId: associatedBook.id,
        title: associatedBook.title,
        author: associatedBook.author,
        sourceUrl: associatedBook.sourceUrl,
        fileFormat: associatedBook.fileFormat,
      });

      // 重置解析状态为pending，触发重新解析
      console.log("[BookRssService.refreshConfig] 重置解析状态为pending");
      await config.update({
        parseStatus: "pending",
        lastUpdateTime: new Date().toISOString(),
      });

      // 触发异步章节解析
      console.log("[BookRssService.refreshConfig] 触发OPDS书籍重新解析");
      this.parseBookChaptersAsync(config.id, config.bookId);
    } else {
      console.log("[BookRssService.refreshConfig] 非OPDS书籍或无bookId，仅更新时间");
      // 更新最后更新时间
      await config.update({ lastUpdateTime: new Date().toISOString() });
    }

    console.log("[BookRssService.refreshConfig] === 获取全局OPDS设置 ===");
    const globalSetting = await GlobalSetting.findOne();
    console.log(
      "[BookRssService.refreshConfig] 全局设置:",
      globalSetting
        ? {
            opdsServerUrl: globalSetting.opdsServerUrl,
            opdsUsername: globalSetting.opdsUsername ? "***" : undefined,
            opdsEnabled: globalSetting.opdsEnabled,
          }
        : "无全局设置"
    );

    const refreshedConfigData = config.toJSON() as BookRssConfigInterface;

    // 注入全局OPDS设置
    refreshedConfigData.opdsConfig = {
      name: "Global OPDS",
      url: globalSetting?.opdsServerUrl || "",
      username: globalSetting?.opdsUsername || "",
      password: globalSetting?.opdsPassword || "",
      authType: "basic" as const,
      enabled: globalSetting?.opdsEnabled || false,
    };

    console.log("[BookRssService.refreshConfig] === 图书RSS配置刷新完成 ===");
    console.log("[BookRssService.refreshConfig] 刷新后状态:", {
      id: refreshedConfigData.id,
      parseStatus: refreshedConfigData.parseStatus,
      lastUpdateTime: refreshedConfigData.lastUpdateTime,
    });

    return { success: true, data: refreshedConfigData, message: "图书RSS配置刷新成功" };
  }

  /**
   * 获取RSS Feed
   */
  async getRssFeed(key: string): Promise<string> {
    const config = await BookRssConfig.findOne({ where: { key } });
    if (!config) throw new Error(`未找到key为${key}的图书RSS配置`);

    const configData = config.toJSON() as any;
    const chapters = await this.fetchChaptersForConfig(configData);
    return this.generateChapterRssXml(configData, chapters);
  }

  /**
   * 获取JSON Feed
   */
  async getRssFeedJson(key: string): Promise<any> {
    const config = await BookRssConfig.findOne({ where: { key } });
    if (!config) throw new Error(`未找到key为${key}的图书RSS配置`);

    const configData = config.toJSON() as any;
    const chapters = await this.fetchChaptersForConfig(configData);
    return this.generateChapterRssJson(configData, chapters);
  }

  /**
   * 获取配置对应的章节数据
   */
  private async fetchChaptersForConfig(
    config: BookRssConfigInterface
  ): Promise<{ chapters: Chapter[]; book: Book }> {
    try {
      // 检查是否有bookId配置
      if (!config.bookId) {
        console.warn("配置中缺少bookId，无法获取章节数据");
        return { chapters: [], book: {} as Book };
      }

      // 获取书籍信息
      const book = await BookModel.findByPk(config.bookId);
      if (!book) {
        console.warn(`未找到ID为${config.bookId}的书籍`);
        return { chapters: [], book: {} as Book };
      }

      const now = new Date();
      const updateIntervalDays = config.updateInterval || 1;
      const lastFeedTime = config.lastFeedTime ? new Date(config.lastFeedTime) : null;
      const minReturnChapters = config.minReturnChapters || 3;
      const chaptersPerUpdate = config.chaptersPerUpdate || 3; // 每次更新返回的章节数

      const currentReadChapter = config.currentReadChapter || 0;

      let chapters: Chapter[] = [];

      // 检查是否到了更新时间
      const shouldUpdate =
        !lastFeedTime ||
        now.getTime() - lastFeedTime.getTime() >= updateIntervalDays * 24 * 60 * 60 * 1000;

      if (shouldUpdate) {
        // 获取所有章节
        const chaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
          page: 1,
          limit: book.totalChapters,
          sortBy: "chapterNumber",
          sortOrder: "asc",
        });

        if (chaptersResult.success && chaptersResult.data) {
          const allChapters = chaptersResult.data.list;

          // OPDS书籍现在在创建时就会有真实的章节记录，无需特殊处理

          // 计算要返回的章节范围
          let startChapter: number;
          let endChapter: number;

          if (currentReadChapter === 0) {
            // 首次阅读，从第1章开始
            startChapter = 1;
            endChapter = Math.min(chaptersPerUpdate, book.totalChapters);
          } else if (currentReadChapter >= book.totalChapters) {
            // 已读完全书，重新开始
            startChapter = 1;
            endChapter = Math.min(chaptersPerUpdate, book.totalChapters);
          } else {
            // 渐进式阅读：包含上一次的章节数据 + 新的章节数据
            const prevChapterStart = Math.max(1, currentReadChapter - chaptersPerUpdate + 1);
            const nextChapterStart = currentReadChapter + 1;
            const nextChapterEnd = Math.min(
              nextChapterStart + chaptersPerUpdate - 1,
              book.totalChapters
            );

            // 返回范围：上一次的章节 + 新的章节
            startChapter = prevChapterStart;
            endChapter = nextChapterEnd;
          }

          // 过滤出指定范围的章节
          chapters = allChapters.filter(
            (chapter) =>
              chapter.chapterNumber >= startChapter && chapter.chapterNumber <= endChapter
          );

          if (chapters.length > 0) {
            // 更新阅读进度到最新章节
            const newReadChapter = Math.max(...chapters.map((c) => c.chapterNumber));

            await BookRssConfig.update(
              {
                lastFeedTime: now,
                currentReadChapter: newReadChapter,
              },
              { where: { id: config.id } }
            );

            if (currentReadChapter === 0) {
              console.log(
                `配置${config.id}首次阅读，返回第${startChapter}-${endChapter}章，更新进度到第${newReadChapter}章`
              );
            } else if (currentReadChapter >= book.totalChapters) {
              console.log(
                `配置${config.id}重新开始阅读，返回第${startChapter}-${endChapter}章，更新进度到第${newReadChapter}章`
              );
            } else {
              console.log(
                `配置${config.id}渐进式阅读，返回第${startChapter}-${endChapter}章（包含上次章节），更新进度到第${newReadChapter}章`
              );
            }
          } else {
            // 没有章节，返回最近的章节
            chapters = allChapters.slice(-minReturnChapters);
            console.log(`配置${config.id}没有可用章节，返回最近${minReturnChapters}章`);

            await BookRssConfig.update({ lastFeedTime: now }, { where: { id: config.id } });
          }
        }
      } else {
        // 还没到更新时间，返回当前阅读进度对应的章节
        console.log(
          `配置${config.id}还未到更新时间，距离下次更新还有${Math.ceil((updateIntervalDays * 24 * 60 * 60 * 1000 - (now.getTime() - lastFeedTime.getTime())) / (60 * 1000))}分钟`
        );

        const chaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
          page: 1,
          limit: book.totalChapters,
          sortBy: "chapterNumber",
          sortOrder: "asc",
        });

        if (chaptersResult.success && chaptersResult.data) {
          const allChapters = chaptersResult.data.list;

          // OPDS书籍现在在创建时就会有真实的章节记录，无需特殊处理

          if (currentReadChapter === 0) {
            // 如果当前进度为0，返回前几章
            chapters = allChapters.slice(0, chaptersPerUpdate);
          } else {
            // 返回当前阅读进度对应的章节范围（包含上一次的章节）
            const currentStart = Math.max(1, currentReadChapter - chaptersPerUpdate + 1);
            const currentEnd = Math.min(currentReadChapter, book.totalChapters);

            chapters = allChapters.filter(
              (chapter) =>
                chapter.chapterNumber >= currentStart && chapter.chapterNumber <= currentEnd
            );
          }
        }
      }

      return { chapters, book: book.toJSON() as Book };
    } catch (error) {
      console.error("获取章节数据失败:", error);
      return { chapters: [], book: {} as Book };
    }
  }

  /**
   * 生成章节RSS XML
   */
  private generateChapterRssXml(
    config: any,
    data: { chapters: Chapter[]; book: Book | null }
  ): string {
    const now = new Date().toUTCString();
    const { chapters, book } = data;
    const baseUrl = process.env.BASE_URL || "http://localhost:8009";

    if (!book) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${this.escapeXml(config.title)}</title>
    <description>书籍未找到</description>
    <link>${baseUrl}/book-rss/${config.key}</link>
    <lastBuildDate>${now}</lastBuildDate>
  </channel>
</rss>`;
    }

    const items = chapters
      .map((chapter) => {
        const chapterUrl = `${baseUrl}/api/book-rss/chapters/${chapter.id}`;

        // 根据配置决定是否包含内容
        const description =
          config.includeContent && chapter.content
            ? `<![CDATA[${chapter.content}]]>`
            : `<![CDATA[第${chapter.chapterNumber}章: ${chapter.title}]]>`;

        return `
    <item>
      <title><![CDATA[第${chapter.chapterNumber}章: ${chapter.title}]]></title>
      <description>${description}</description>
      <link>${chapterUrl}</link>
      <guid>${chapterUrl}</guid>
      <pubDate>${chapter.createdAt ? new Date(chapter.createdAt).toUTCString() : now}</pubDate>
      <author>${this.escapeXml(book.author)}</author>
      <category>第${chapter.chapterNumber}章</category>
    </item>`;
      })
      .join("");

    // 添加书籍信息到RSS标题和描述中
    const rssTitle = `${book.title} - ${config.title}`;
    const rssDescription = `${book.title} by ${book.author} - ${config.description || `${book.title} - ${book.author} 的章节更新`}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${rssTitle}]]></title>
    <description><![CDATA[${rssDescription}]]></description>
    <link>${baseUrl}/book-rss/${config.key}</link>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>FeedHub Chapter RSS</generator>
    <language>zh-cn</language>
    <ttl>${(config.updateInterval || 1) * 1440}</ttl>
    <image>
      <title>${this.escapeXml(book.title)}</title>
      <url>${book.coverUrl || `${baseUrl}/default-book-cover.png`}</url>
      <link>${baseUrl}/book/${book.id}</link>
    </image>${items}
  </channel>
</rss>`;
  }

  /**
   * 生成章节RSS JSON
   */
  private generateChapterRssJson(
    config: any,
    data: { chapters: Chapter[]; book: Book | null }
  ): any {
    const { chapters, book } = data;
    const baseUrl = process.env.BASE_URL || "http://localhost:8009";

    if (!book) {
      return {
        version: "https://jsonfeed.org/version/1",
        title: config.title,
        description: "书籍未找到",
        items: [],
      };
    }

    const items = chapters.map((chapter) => {
      const chapterUrl = `${baseUrl}/api/book-rss/chapters/${chapter.id}`;

      return {
        id: `chapter-${chapter.id}`,
        title: `第${chapter.chapterNumber}章: ${chapter.title}`,
        content_text:
          config.includeContent && chapter.content
            ? chapter.content
            : `第${chapter.chapterNumber}章: ${chapter.title}`,
        content_html:
          config.includeContent && chapter.content
            ? `<h2>第${chapter.chapterNumber}章 ${chapter.title}</h2><div>${chapter.content.replace(/\n/g, "<br>")}</div>`
            : `<h2>第${chapter.chapterNumber}章 ${chapter.title}</h2>`,
        url: chapterUrl,
        date_published: (() => {
          try {
            if (chapter.publishTime) {
              const date = new Date(chapter.publishTime);
              if (isNaN(date.getTime())) {
                return new Date().toISOString();
              }
              return date.toISOString();
            } else {
              return new Date().toISOString();
            }
          } catch (error) {
            return new Date().toISOString();
          }
        })(),
        authors: [{ name: book.author }],
        tags: [`第${chapter.chapterNumber}章`, book.title],
        summary: `${book.title} 第${chapter.chapterNumber}章`,
        _chapter_number: chapter.chapterNumber,
        _word_count: chapter.wordCount,
      };
    });

    // 添加书籍信息到JSON Feed标题和描述中
    const feedTitle = `${book.title} - ${config.title}`;
    const feedDescription = `${book.title} by ${book.author} - ${config.description || `${book.title} - ${book.author} 的章节更新`}`;

    return {
      version: "https://jsonfeed.org/version/1",
      title: feedTitle,
      description: feedDescription,
      home_page_url: `${baseUrl}/book/${book.id}`,
      feed_url: `${baseUrl}/api/book-rss/feed/${config.key}/json`,
      language: "zh-cn",
      icon: book.coverUrl,
      authors: [{ name: book.author }],
      _book_info: {
        title: book.title,
        author: book.author,
        total_chapters: book.totalChapters,
        description: book.description,
      },
      items,
    };
  }

  /**
   * 获取MIME类型
   */
  private getMimeType(fileFormat: string): string {
    switch (fileFormat.toLowerCase()) {
      case "epub":
        return "application/epub+zip";
      case "pdf":
        return "application/pdf";
      case "txt":
        return "text/plain";
      case "mobi":
        return "application/x-mobipocket-ebook";
      default:
        return "application/octet-stream";
    }
  }

  /**
   * 获取文件格式对应的MIME类型
   */
  private getFileFormatMimeType(fileFormat: string): string {
    const formatToMime: { [key: string]: string } = {
      epub: "application/epub+zip",
      pdf: "application/pdf",
      mobi: "application/x-mobipocket-ebook",
      azw: "application/vnd.amazon.ebook",
      azw3: "application/x-kindle-application",
      chm: "application/vnd.ms-htmlhelp",
      fb2: "application/x-fictionbook+xml",
      ncx: "application/x-dtbncx+xml",
      txt: "text/plain",
      html: "text/html",
      htm: "text/html",
    };
    return formatToMime[fileFormat] || "application/octet-stream";
  }

  /**
   * 转义XML特殊字符
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * 异步解析书籍章节
   */
  private async parseBookChaptersAsync(configId: number, bookId: number): Promise<void> {
    try {
      console.log("[BookRssService.parseBookChaptersAsync] === 开始异步解析书籍章节 ===");
      console.log("[BookRssService.parseBookChaptersAsync] 配置ID:", configId, "书籍ID:", bookId);

      // 更新解析状态为进行中
      console.log("[BookRssService.parseBookChaptersAsync] 更新解析状态为parsing");
      await BookRssConfig.update(
        { parseStatus: "parsing", lastParseTime: new Date() },
        { where: { id: configId } }
      );

      // 获取书籍信息
      console.log("[BookRssService.parseBookChaptersAsync] 获取书籍信息，ID:", bookId);
      const book = await BookModel.findByPk(bookId);
      if (!book) {
        console.error("[BookRssService.parseBookChaptersAsync] 书籍不存在，ID:", bookId);
        throw new Error(`未找到ID为${bookId}的书籍`);
      }

      console.log("[BookRssService.parseBookChaptersAsync] 书籍信息:", {
        id: book.id,
        title: book.title,
        author: book.author,
        sourceType: book.sourceType,
        sourceUrl: book.sourceUrl,
        fileFormat: book.fileFormat,
        totalChapters: book.totalChapters,
      });

      // 对于OPDS书籍，检查是否需要重新下载和解析EPUB文件
      if (book.sourceType === "opds") {
        console.log("[BookRssService.parseBookChaptersAsync] === OPDS书籍解析流程 ===");
        console.log("[BookRssService.parseBookChaptersAsync] 书籍是OPDS类型，检查章节状态");

        // 检查是否已有真实的章节内容（不是默认章节）
        console.log("[BookRssService.parseBookChaptersAsync] 查询现有章节");
        const existingChapters = await ChapterModel.findAll({
          where: { bookId },
          limit: 5, // 只检查前几个章节
          attributes: ["id", "chapterNumber", "title", "content", "wordCount"],
        });

        console.log(
          "[BookRssService.parseBookChaptersAsync] 现有章节数量:",
          existingChapters.length
        );
        if (existingChapters.length > 0) {
          console.log(
            "[BookRssService.parseBookChaptersAsync] 现有章节详情:",
            existingChapters.map((ch) => ({
              id: ch.id,
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              contentLength: ch.content?.length || 0,
              wordCount: ch.wordCount,
            }))
          );
        }

        // 如果有章节且不是默认章节，则跳过解析
        if (existingChapters.length > 0) {
          const hasRealContent = existingChapters.some(
            (chapter) =>
              chapter.content &&
              chapter.content.length > 200 &&
              !chapter.content.includes("这是一本来自OPDS服务的电子书")
          );

          console.log(
            "[BookRssService.parseBookChaptersAsync] 检查章节内容质量，hasRealContent:",
            hasRealContent
          );

          if (hasRealContent) {
            console.log("[BookRssService.parseBookChaptersAsync] 书籍已有真实章节内容，跳过解析");
            await BookRssConfig.update(
              { parseStatus: "completed", lastParseTime: new Date() },
              { where: { id: configId } }
            );
            return;
          } else {
            console.log("[BookRssService.parseBookChaptersAsync] 书籍只有默认章节，删除并重新解析");
            const deletedCount = await ChapterModel.destroy({ where: { bookId } });
            console.log("[BookRssService.parseBookChaptersAsync] 删除默认章节数量:", deletedCount);
          }
        } else {
          console.log("[BookRssService.parseBookChaptersAsync] 书籍无现有章节，开始解析");
        }

        // 使用BookService的公共方法重新下载和解析EPUB文件
        if (book.sourceUrl && book.fileFormat === "epub") {
          try {
            console.log("[BookRssService.parseBookChaptersAsync] === 开始EPUB下载和解析 ===");
            console.log("[BookRssService.parseBookChaptersAsync] EPUB下载URL:", book.sourceUrl);
            console.log("[BookRssService.parseBookChaptersAsync] 文件格式:", book.fileFormat);

            const redownloadResult = await this.bookService.redownloadAndParseOpdsBook(bookId);
            console.log("[BookRssService.parseBookChaptersAsync] EPUB下载结果:", {
              success: redownloadResult.success,
              chaptersCount: redownloadResult.chapters?.length || 0,
              totalChapters: redownloadResult.totalChapters,
              lastChapterTitle: redownloadResult.lastChapterTitle,
              filePath: redownloadResult.filePath,
              error: redownloadResult.error,
            });

            if (redownloadResult.success && redownloadResult.chapters) {
              console.log("[BookRssService.parseBookChaptersAsync] EPUB文件下载和解析成功");

              if (redownloadResult.chapters.length > 0) {
                console.log("[BookRssService.parseBookChaptersAsync] === 创建章节记录 ===");
                // 创建真实的章节记录
                const chaptersToCreate = redownloadResult.chapters.map(
                  (chapter: any, index: number) => ({
                    bookId: book.id,
                    chapterNumber: index + 1,
                    title: chapter.title,
                    content: chapter.content,
                    wordCount: chapter.wordCount,
                    publishTime: chapter.publishTime || new Date(),
                    isNew: false,
                  })
                );

                console.log(
                  "[BookRssService.parseBookChaptersAsync] 即将创建章节数量:",
                  chaptersToCreate.length
                );
                console.log(
                  "[BookRssService.parseBookChaptersAsync] 章节预览:",
                  chaptersToCreate.slice(0, 3).map((ch) => ({
                    chapterNumber: ch.chapterNumber,
                    title: ch.title,
                    contentLength: ch.content?.length || 0,
                    wordCount: ch.wordCount,
                  }))
                );

                await ChapterModel.bulkCreate(chaptersToCreate);
                console.log("[BookRssService.parseBookChaptersAsync] 章节记录创建完成");

                // 更新书籍信息
                console.log("[BookRssService.parseBookChaptersAsync] === 更新书籍信息 ===");
                const updateData = {
                  totalChapters: redownloadResult.totalChapters,
                  lastChapterTitle: redownloadResult.lastChapterTitle,
                  sourcePath: redownloadResult.filePath,
                };
                console.log("[BookRssService.parseBookChaptersAsync] 书籍更新数据:", updateData);

                await BookModel.update(updateData, { where: { id: bookId } });
                console.log("[BookRssService.parseBookChaptersAsync] 书籍信息更新完成");

                console.log(
                  "[BookRssService.parseBookChaptersAsync] EPUB解析成功，创建了",
                  redownloadResult.chapters.length,
                  "个章节"
                );

                await BookRssConfig.update(
                  { parseStatus: "completed", lastParseTime: new Date() },
                  { where: { id: configId } }
                );
                console.log("[BookRssService.parseBookChaptersAsync] 解析状态更新为completed");
                return;
              } else {
                console.warn("[BookRssService.parseBookChaptersAsync] EPUB解析成功但无章节内容");
              }
            } else {
              console.warn(
                "[BookRssService.parseBookChaptersAsync] EPUB下载或解析失败:",
                redownloadResult.error
              );
            }
          } catch (error) {
            console.error("[BookRssService.parseBookChaptersAsync] EPUB重新下载或解析异常:", {
              message: error instanceof Error ? error.message : "未知错误",
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        } else {
          console.log("[BookRssService.parseBookChaptersAsync] 跳过EPUB下载，原因:", {
            hasSourceUrl: !!book.sourceUrl,
            fileFormat: book.fileFormat,
            isEpub: book.fileFormat === "epub",
          });
        }

        // 如果下载失败，创建默认章节
        console.log("[BookRssService.parseBookChaptersAsync] === 创建默认章节 ===");
        console.log("[BookRssService.parseBookChaptersAsync] EPUB下载失败，创建默认章节作为备选");

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

        console.log("[BookRssService.parseBookChaptersAsync] 默认章节数据:", {
          bookId: chapterData.bookId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          contentLength: chapterData.content.length,
          wordCount: chapterData.wordCount,
        });

        await ChapterModel.create(chapterData);
        console.log("[BookRssService.parseBookChaptersAsync] 默认章节创建完成");

        await BookRssConfig.update(
          { parseStatus: "completed", lastParseTime: new Date() },
          { where: { id: configId } }
        );
        console.log("[BookRssService.parseBookChaptersAsync] OPDS书籍解析完成（使用默认章节）");
        return;
      }

      // 对于非OPDS书籍，检查是否已有章节，如果有则跳过解析
      console.log("[BookRssService.parseBookChaptersAsync] === 非OPDS书籍解析流程 ===");
      const existingChapters = await ChapterModel.count({ where: { bookId } });
      console.log("[BookRssService.parseBookChaptersAsync] 现有章节数量:", existingChapters);

      if (existingChapters > 0) {
        console.log("[BookRssService.parseBookChaptersAsync] 书籍已有章节，跳过解析");
        await BookRssConfig.update(
          { parseStatus: "completed", lastParseTime: new Date() },
          { where: { id: configId } }
        );
        return;
      }

      if (!book.sourcePath) {
        console.error(
          "[BookRssService.parseBookChaptersAsync] 书籍缺少文件路径，sourcePath:",
          book.sourcePath
        );
        throw new Error(`书籍${bookId}缺少文件路径`);
      }

      console.log("[BookRssService.parseBookChaptersAsync] === 开始文件解析 ===");
      console.log("[BookRssService.parseBookChaptersAsync] 文件路径:", book.sourcePath);
      console.log("[BookRssService.parseBookChaptersAsync] 文件格式:", book.fileFormat);

      // 调用BookService的解析方法
      const mimeType = this.getFileFormatMimeType(book.fileFormat || "unknown");
      console.log("[BookRssService.parseBookChaptersAsync] MIME类型:", mimeType);

      const parseResult = await this.bookService.parseBookFile(book.sourcePath, mimeType);
      console.log("[BookRssService.parseBookChaptersAsync] 文件解析结果:", {
        chaptersCount: parseResult.chapters.length,
        totalChapters: parseResult.totalChapters,
        lastChapterTitle: parseResult.lastChapterTitle,
      });

      // 创建章节记录
      if (parseResult.chapters.length > 0) {
        console.log("[BookRssService.parseBookChaptersAsync] === 创建章节记录 ===");
        const chaptersToCreate = parseResult.chapters.map((chapter: any) => ({
          ...chapter,
          bookId: book.id,
        }));

        console.log(
          "[BookRssService.parseBookChaptersAsync] 章节预览:",
          chaptersToCreate.slice(0, 3).map((ch) => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            contentLength: ch.content?.length || 0,
            wordCount: ch.wordCount,
          }))
        );

        await ChapterModel.bulkCreate(chaptersToCreate);
        console.log("[BookRssService.parseBookChaptersAsync] 章节记录创建完成");

        // 更新书籍的章节统计
        console.log("[BookRssService.parseBookChaptersAsync] === 更新书籍统计信息 ===");
        const updateData = {
          totalChapters: parseResult.totalChapters,
          lastChapterTitle: parseResult.lastChapterTitle,
          lastChapterTime: parseResult.lastChapterTitle ? new Date() : undefined,
        };
        console.log("[BookRssService.parseBookChaptersAsync] 书籍更新数据:", updateData);

        await BookModel.update(updateData, { where: { id: bookId } });
        console.log("[BookRssService.parseBookChaptersAsync] 书籍统计信息更新完成");

        console.log(
          "[BookRssService.parseBookChaptersAsync] 书籍章节解析完成，共",
          parseResult.chapters.length,
          "个章节"
        );
      } else {
        console.warn("[BookRssService.parseBookChaptersAsync] 文件解析成功但无章节内容");
      }

      // 更新解析状态为完成
      await BookRssConfig.update(
        { parseStatus: "completed", lastParseTime: new Date() },
        { where: { id: configId } }
      );
      console.log("[BookRssService.parseBookChaptersAsync] 非OPDS书籍解析完成");
    } catch (error) {
      console.error("[BookRssService.parseBookChaptersAsync] === 书籍章节解析失败 ===");
      console.error("[BookRssService.parseBookChaptersAsync] 配置ID:", configId, "书籍ID:", bookId);
      console.error("[BookRssService.parseBookChaptersAsync] 错误详情:", {
        message: error instanceof Error ? error.message : "未知错误",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      // 更新解析状态为失败
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.log(
        "[BookRssService.parseBookChaptersAsync] 更新解析状态为failed，错误信息:",
        errorMessage
      );

      await BookRssConfig.update(
        {
          parseStatus: "failed",
          parseError: errorMessage,
          lastParseTime: new Date(),
        },
        { where: { id: configId } }
      );

      console.log("[BookRssService.parseBookChaptersAsync] 解析状态已更新为failed");
    }
  }
}
