import { injectable, inject } from "inversify";
import { ApiResponseData } from "../utils/apiResponse";
import BookRssConfig from "../models/BookRssConfigModel";
import { BookRssConfigAttributes, BookRssConfigCreationAttributes } from "../models/BookRssConfigModel";
import GlobalSetting from "../models/GlobalSetting";
import { BookRssConfig as BookRssConfigInterface, Book, Chapter } from '@feedhub/shared/src/types/bookRss';
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
      console.log('[BookRssService] 开始获取所有图书RSS配置');
      
      console.log('[BookRssService] 查询BookRssConfig数据...');
      const configs = await BookRssConfig.findAll({
        include: [
          {
            model: BookModel,
            as: 'book',
            attributes: ['id', 'title', 'author', 'totalChapters', 'description', 'sourceType', 'opdsConfigId'],
            required: false
          }
        ]
      });
      console.log(`[BookRssService] 查询到 ${configs.length} 个配置`);
      
      console.log('[BookRssService] 查询全局设置...');
      const globalSetting = await GlobalSetting.findOne();
      console.log(`[BookRssService] 全局设置查询完成: ${globalSetting ? '存在' : '不存在'}`);
      
      console.log('[BookRssService] 开始处理配置数据...');
      // 将全局OPDS设置注入到每个配置中，并添加书籍信息
      const configsWithGlobalOpds = configs.map((config, index) => {
        console.log(`[BookRssService] 处理配置 ${index + 1}/${configs.length}, ID: ${config.id}`);
        
        const configData = config.toJSON() as any;
        console.log(`[BookRssService] 配置 ${config.id} 原始数据:`, JSON.stringify(configData, null, 2));
        
        configData.opdsConfig = {
          name: 'Global OPDS',
          url: globalSetting?.opdsServerUrl || '',
          username: globalSetting?.opdsUsername || '',
          password: globalSetting?.opdsPassword || '',
          authType: 'basic' as const,
          enabled: globalSetting?.opdsEnabled || false
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
            opdsConfigId: configData.book.opdsConfigId
          };
        } else {
          console.log(`[BookRssService] 配置 ${config.id} 不包含书籍信息`);
        }
        
        console.log(`[BookRssService] 配置 ${config.id} 处理后数据:`, JSON.stringify(configData, null, 2));
        return configData;
      });
      
      console.log(`[BookRssService] 所有配置处理完成，返回 ${configsWithGlobalOpds.length} 个配置`);
      return { success: true, data: configsWithGlobalOpds, message: "获取图书RSS配置列表成功" };
      
    } catch (error: any) {
      console.error('[BookRssService] getAllConfigs 发生错误:', error);
      console.error('[BookRssService] 错误堆栈:', error.stack);
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
          as: 'book',
          attributes: ['id', 'title', 'author', 'totalChapters', 'description', 'sourceType', 'opdsConfigId'],
          required: false
        }
      ]
    });
    if (!config) throw new Error(`未找到ID为${id}的图书RSS配置`);
    
    const globalSetting = await GlobalSetting.findOne();
    const configData = config.toJSON() as any;
    
    // 注入全局OPDS设置
    configData.opdsConfig = {
      name: 'Global OPDS',
      url: globalSetting?.opdsServerUrl || '',
      username: globalSetting?.opdsUsername || '',
      password: globalSetting?.opdsPassword || '',
      authType: 'basic' as const,
      enabled: globalSetting?.opdsEnabled || false
    };
    
    // 添加书籍信息
    if (configData.book) {
      configData.bookInfo = {
        id: configData.book.id,
        title: configData.book.title,
        author: configData.book.author,
        totalChapters: configData.book.totalChapters,
        sourceType: configData.book.sourceType,
        opdsConfigId: configData.book.opdsConfigId
      };
    }
    
    return { success: true, data: configData, message: "获取图书RSS配置成功" };
  }

  /**
   * 添加新的图书RSS配置
   */
  async addConfig(
    configData: Omit<BookRssConfigInterface, 'id' | 'createdAt' | 'updatedAt' | 'opdsConfig'>
  ): Promise<ApiResponseData<BookRssConfigInterface>> {
    // 生成唯一的key
    const key = configData.key || `book-rss-${Date.now()}`;
    
    const newConfig = await BookRssConfig.create({
      ...configData,
      key,
      opdsConfig: {
         name: '',
         url: '',
         authType: 'none' as const,
         enabled: false
       }, // 占位符，实际使用全局设置
      // 确保新字段被正确保存
      bookId: configData.bookId,
      includeContent: configData.includeContent || false,
      maxChapters: configData.maxChapters || 50,
      parseStatus: 'pending'
    });
    
    // 如果配置了书籍ID，触发异步章节解析
    if (configData.bookId) {
      this.parseBookChaptersAsync(newConfig.id, configData.bookId);
    }
    
    const globalSetting = await GlobalSetting.findOne();
    const configWithGlobalOpds = newConfig.toJSON() as BookRssConfigInterface;
    
    // 注入全局OPDS设置
    configWithGlobalOpds.opdsConfig = {
      name: 'Global OPDS',
      url: globalSetting?.opdsServerUrl || '',
      username: globalSetting?.opdsUsername || '',
      password: globalSetting?.opdsPassword || '',
      authType: 'basic' as const,
      enabled: globalSetting?.opdsEnabled || false
    };
    
    return { success: true, data: configWithGlobalOpds, message: "图书RSS配置添加成功" };
  }

  /**
   * 更新图书RSS配置
   */
  async updateConfig(
    id: number,
    configData: Partial<Omit<BookRssConfigInterface, 'opdsConfig'>>
  ): Promise<ApiResponseData<BookRssConfigInterface>> {
    const config = await BookRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的图书RSS配置`);

    // 确保新字段被正确更新
    const updateData = {
      ...configData,
      bookId: configData.bookId,
      includeContent: configData.includeContent,
      maxChapters: configData.maxChapters
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
      name: 'Global OPDS',
      url: globalSetting?.opdsServerUrl || '',
      username: globalSetting?.opdsUsername || '',
      password: globalSetting?.opdsPassword || '',
      authType: 'basic' as const,
      enabled: globalSetting?.opdsEnabled || false
    };
    
    return { success: true, data: updatedConfigData, message: "图书RSS配置更新成功" };
  }

  /**
   * 删除图书RSS配置
   */
  async deleteConfig(id: number): Promise<ApiResponseData<void>> {
    const config = await BookRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的图书RSS配置`);

    await BookRssConfig.destroy({ where: { id } });
    return { success: true, data: undefined, message: "图书RSS配置删除成功" };
  }

  /**
   * 刷新配置（手动更新图书列表）
   */
  async refreshConfig(id: number): Promise<ApiResponseData<BookRssConfigInterface>> {
    const config = await BookRssConfig.findByPk(id);
    if (!config) throw new Error(`未找到ID为${id}的图书RSS配置`);

    // 更新最后更新时间
    await config.update({ lastUpdateTime: new Date().toISOString() });
    
    const globalSetting = await GlobalSetting.findOne();
    const refreshedConfigData = config.toJSON() as BookRssConfigInterface;
    
    // 注入全局OPDS设置
    refreshedConfigData.opdsConfig = {
      name: 'Global OPDS',
      url: globalSetting?.opdsServerUrl || '',
      username: globalSetting?.opdsUsername || '',
      password: globalSetting?.opdsPassword || '',
      authType: 'basic' as const,
      enabled: globalSetting?.opdsEnabled || false
    };
    
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
  private async fetchChaptersForConfig(config: BookRssConfigInterface): Promise<{ chapters: Chapter[], book: Book }> {
    try {
       // 检查是否有bookId配置
       if (!config.bookId) {
         console.warn('配置中缺少bookId，无法获取章节数据');
         return { chapters: [], book: {} as Book };
       }

       // 获取书籍信息
       const book = await BookModel.findByPk(config.bookId);
       if (!book) {
         console.warn(`未找到ID为${config.bookId}的书籍`);
         return { chapters: [], book: {} as Book };
       }

       // 计算时间窗口进行增量更新
       const now = new Date();
       const updateIntervalDays = config.updateInterval || 1;
       const lastFeedTime = config.lastFeedTime ? new Date(config.lastFeedTime) : null;
       const minReturnChapters = config.minReturnChapters || 3;
       
       let chapters: Chapter[] = [];
       const maxChapters = config.maxChapters || 50;
       
       // 如果强制全量更新，直接返回最新章节
       if (config.forceFullUpdate) {
         const chaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
           page: 1,
           limit: maxChapters,
           sortBy: 'chapterNumber',
           sortOrder: 'desc'
         });
         
         if (chaptersResult.success && chaptersResult.data) {
           chapters = chaptersResult.data.list;
           console.log(`配置${config.id}强制全量更新，返回最新${chapters.length}章`);
         }
         
         // 更新lastFeedTime
         await BookRssConfig.update(
           { lastFeedTime: now },
           { where: { id: config.id } }
         );
         
         return { chapters, book: book.toJSON() as Book };
       }
       
       if (lastFeedTime) {
         // 计算时间窗口：从上次生成RSS的时间开始
         const timeWindowStart = new Date(lastFeedTime.getTime() - (updateIntervalDays * 24 * 60 * 60 * 1000));
         
         // 获取时间窗口内的新章节
         const newChaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
           page: 1,
           limit: maxChapters,
           sortBy: 'chapterNumber',
           sortOrder: 'desc'
         });
         
         if (newChaptersResult.success && newChaptersResult.data) {
           // 过滤出在时间窗口内创建或更新的章节
           chapters = newChaptersResult.data.list.filter(chapter => {
             const chapterTime = new Date(chapter.createdAt || chapter.updatedAt || 0);
             return chapterTime >= timeWindowStart;
           });
           
           // 如果没有新章节，返回最近的指定数量章节避免空RSS
           if (chapters.length === 0) {
             chapters = newChaptersResult.data.list.slice(0, minReturnChapters);
             console.log(`配置${config.id}在时间窗口内无新章节，返回最近${minReturnChapters}章`);
           } else {
             console.log(`配置${config.id}在时间窗口内找到${chapters.length}个新章节`);
           }
         }
       } else {
         // 首次生成RSS，返回最新的章节
         const chaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
           page: 1,
           limit: maxChapters,
           sortBy: 'chapterNumber',
           sortOrder: 'desc'
         });
         
         if (chaptersResult.success && chaptersResult.data) {
           chapters = chaptersResult.data.list;
           console.log(`配置${config.id}首次生成RSS，返回最新${chapters.length}章`);
         }
       }
       
       // 更新lastFeedTime
       await BookRssConfig.update(
         { lastFeedTime: now },
         { where: { id: config.id } }
       );

       return { chapters, book: book.toJSON() as Book };
     } catch (error) {
       console.error('获取章节数据失败:', error);
       return { chapters: [], book: {} as Book };
     }
   }

  /**
   * 生成章节RSS XML
   */
  private generateChapterRssXml(config: any, data: { chapters: Chapter[], book: Book | null }): string {
    const now = new Date().toUTCString();
    const { chapters, book } = data;
    const baseUrl = process.env.BASE_URL || 'http://localhost:8009';
    
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
    
    const items = chapters.map(chapter => {
      const chapterUrl = `${baseUrl}/api/book-rss/chapters/${chapter.id}`;
      
      // 根据配置决定是否包含内容
      const description = config.includeContent && chapter.content 
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
    }).join('');
    
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
  private generateChapterRssJson(config: any, data: { chapters: Chapter[], book: Book | null }): any {
    const { chapters, book } = data;
    const baseUrl = process.env.BASE_URL || 'http://localhost:8009';
    
    if (!book) {
      return {
        version: "https://jsonfeed.org/version/1",
        title: config.title,
        description: "书籍未找到",
        items: []
      };
    }
    
    const items = chapters.map(chapter => {
      const chapterUrl = `${baseUrl}/api/book-rss/chapters/${chapter.id}`;
      
      return {
        id: `chapter-${chapter.id}`,
        title: `第${chapter.chapterNumber}章: ${chapter.title}`,
        content_text: config.includeContent && chapter.content ? chapter.content : `第${chapter.chapterNumber}章: ${chapter.title}`,
        content_html: config.includeContent && chapter.content ? 
          `<h2>第${chapter.chapterNumber}章 ${chapter.title}</h2><div>${chapter.content.replace(/\n/g, '<br>')}</div>` : 
          `<h2>第${chapter.chapterNumber}章 ${chapter.title}</h2>`,
        url: chapterUrl,
        date_published: chapter.createdAt ? new Date(chapter.createdAt).toISOString() : new Date().toISOString(),
        authors: [{ name: book.author }],
        tags: [`第${chapter.chapterNumber}章`, book.title],
        summary: `${book.title} 第${chapter.chapterNumber}章`,
        _chapter_number: chapter.chapterNumber,
        _word_count: chapter.wordCount
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
      language: 'zh-cn',
      icon: book.coverUrl,
      authors: [{ name: book.author }],
      _book_info: {
        title: book.title,
        author: book.author,
        total_chapters: book.totalChapters,
        description: book.description
      },
      items
    };
  }

  /**
   * 获取MIME类型
   */
  private getMimeType(fileFormat: string): string {
    switch (fileFormat.toLowerCase()) {
      case 'epub':
        return 'application/epub+zip';
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      case 'mobi':
        return 'application/x-mobipocket-ebook';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * 转义XML特殊字符
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 异步解析书籍章节
   */
  private async parseBookChaptersAsync(configId: number, bookId: number): Promise<void> {
    try {
      console.log(`开始异步解析书籍章节，配置ID: ${configId}, 书籍ID: ${bookId}`);
      
      // 更新解析状态为进行中
      await BookRssConfig.update(
        { parseStatus: 'parsing', lastParseTime: new Date() },
        { where: { id: configId } }
      );
      
      // 获取书籍信息
      const book = await BookModel.findByPk(bookId);
      if (!book) {
        throw new Error(`未找到ID为${bookId}的书籍`);
      }
      
      if (!book.sourcePath) {
        throw new Error(`书籍${bookId}缺少文件路径`);
      }
      
      // 检查是否已有章节，如果有则跳过解析
      const existingChapters = await ChapterModel.count({ where: { bookId } });
      if (existingChapters > 0) {
        console.log(`书籍${bookId}已有${existingChapters}个章节，跳过解析`);
        await BookRssConfig.update(
          { parseStatus: 'completed', lastParseTime: new Date() },
          { where: { id: configId } }
        );
        return;
      }
      
      // 调用BookService的解析方法
      const parseResult = await this.bookService.parseBookFile(book.sourcePath, book.fileFormat || 'unknown');
      
      // 创建章节记录
      if (parseResult.chapters.length > 0) {
        const chaptersToCreate = parseResult.chapters.map((chapter: any) => ({
          ...chapter,
          bookId: book.id,
        }));
        await ChapterModel.bulkCreate(chaptersToCreate);
        
        // 更新书籍的章节统计
        await BookModel.update(
          {
            totalChapters: parseResult.totalChapters,
            lastChapterTitle: parseResult.lastChapterTitle,
            lastChapterTime: parseResult.lastChapterTitle ? new Date() : undefined,
          },
          { where: { id: bookId } }
        );
        
        console.log(`书籍${bookId}章节解析完成，共${parseResult.chapters.length}个章节`);
      }
      
      // 更新解析状态为完成
      await BookRssConfig.update(
        { parseStatus: 'completed', lastParseTime: new Date() },
        { where: { id: configId } }
      );
      
    } catch (error) {
      console.error(`书籍章节解析失败，配置ID: ${configId}, 书籍ID: ${bookId}`, error);
      
      // 更新解析状态为失败
      await BookRssConfig.update(
        {
          parseStatus: 'failed',
          parseError: error instanceof Error ? error.message : '未知错误',
          lastParseTime: new Date()
        },
        { where: { id: configId } }
      );
    }
  }
}