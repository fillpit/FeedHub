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
    configData: Omit<BookRssConfigInterface, 'id' | 'createdAt' | 'updatedAt' | 'opdsConfig'>,
    opdsBook?: any
  ): Promise<ApiResponseData<BookRssConfigInterface>> {
    // 生成唯一的key
    const key = configData.key || `book-rss-${Date.now()}`;
    
    let bookId = configData.bookId;
    
    // 如果提供了OPDS书籍数据，先创建书籍记录
    if (opdsBook) {
      console.log('[BookRssService] 处理OPDS书籍数据:', opdsBook);
      const bookResult = await this.bookService.addBookFromOpds({
        title: opdsBook.title,
        author: opdsBook.author,
        description: opdsBook.description,
        sourceUrl: opdsBook.link,
        language: opdsBook.language || 'zh',
        categories: opdsBook.categories || [],
        fileFormat: opdsBook.fileFormat || 'epub',
        totalChapters: opdsBook.totalChapters || 1,
        updateFrequency: 60
      });
      
      if (bookResult.success && bookResult.data) {
        bookId = bookResult.data.id;
        console.log('[BookRssService] OPDS书籍创建成功，ID:', bookId);
      } else {
        console.error('[BookRssService] OPDS书籍创建失败:', bookResult.error);
        throw new Error(`创建OPDS书籍失败: ${bookResult.error}`);
      }
    }
    
    const newConfig = await BookRssConfig.create({
      ...configData,
      key,
      bookId,
      opdsConfig: {
         name: '',
         url: '',
         authType: 'none' as const,
         enabled: false
       }, // 占位符，实际使用全局设置
      // 确保新字段被正确保存
      includeContent: configData.includeContent || false,

      parseStatus: 'pending'
    });
    
    // 如果配置了书籍ID，触发异步章节解析
    if (bookId) {
      this.parseBookChaptersAsync(newConfig.id, bookId);
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

       const now = new Date();
       const updateIntervalDays = config.updateInterval || 1;
       const lastFeedTime = config.lastFeedTime ? new Date(config.lastFeedTime) : null;
       const minReturnChapters = config.minReturnChapters || 3;
       const chaptersPerUpdate = config.chaptersPerUpdate || 3; // 每次更新返回的章节数

       const currentReadChapter = config.currentReadChapter || 0;
       
       let chapters: Chapter[] = [];
       

       
       // 检查是否到了更新时间
       const shouldUpdate = !lastFeedTime || 
         (now.getTime() - lastFeedTime.getTime()) >= (updateIntervalDays * 24 * 60 * 60 * 1000);
       
       if (shouldUpdate) {
         // 获取所有章节
         const chaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
           page: 1,
           limit: book.totalChapters,
           sortBy: 'chapterNumber',
           sortOrder: 'asc'
         });
         
         if (chaptersResult.success && chaptersResult.data) {
           let allChapters = chaptersResult.data.list;
           
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
             const nextChapterEnd = Math.min(nextChapterStart + chaptersPerUpdate - 1, book.totalChapters);
             
             // 返回范围：上一次的章节 + 新的章节
             startChapter = prevChapterStart;
             endChapter = nextChapterEnd;
           }
           
           // 过滤出指定范围的章节
           chapters = allChapters.filter(chapter => 
             chapter.chapterNumber >= startChapter && chapter.chapterNumber <= endChapter
           );
           
           if (chapters.length > 0) {
             // 更新阅读进度到最新章节
             const newReadChapter = Math.max(...chapters.map(c => c.chapterNumber));
             
             await BookRssConfig.update(
               { 
                 lastFeedTime: now,
                 currentReadChapter: newReadChapter
               },
               { where: { id: config.id } }
             );
             
             if (currentReadChapter === 0) {
               console.log(`配置${config.id}首次阅读，返回第${startChapter}-${endChapter}章，更新进度到第${newReadChapter}章`);
             } else if (currentReadChapter >= book.totalChapters) {
               console.log(`配置${config.id}重新开始阅读，返回第${startChapter}-${endChapter}章，更新进度到第${newReadChapter}章`);
             } else {
               console.log(`配置${config.id}渐进式阅读，返回第${startChapter}-${endChapter}章（包含上次章节），更新进度到第${newReadChapter}章`);
             }
           } else {
             // 没有章节，返回最近的章节
             chapters = allChapters.slice(-minReturnChapters);
             console.log(`配置${config.id}没有可用章节，返回最近${minReturnChapters}章`);
             
             await BookRssConfig.update(
               { lastFeedTime: now },
               { where: { id: config.id } }
             );
           }
         }
       } else {
         // 还没到更新时间，返回当前阅读进度对应的章节
         console.log(`配置${config.id}还未到更新时间，距离下次更新还有${Math.ceil((updateIntervalDays * 24 * 60 * 60 * 1000 - (now.getTime() - lastFeedTime.getTime())) / (60 * 1000))}分钟`);
         
         const chaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
           page: 1,
           limit: book.totalChapters,
           sortBy: 'chapterNumber',
           sortOrder: 'asc'
         });
         
         if (chaptersResult.success && chaptersResult.data) {
           let allChapters = chaptersResult.data.list;
           
           // OPDS书籍现在在创建时就会有真实的章节记录，无需特殊处理
           
           if (currentReadChapter === 0) {
             // 如果当前进度为0，返回前几章
             chapters = allChapters.slice(0, chaptersPerUpdate);
           } else {
             // 返回当前阅读进度对应的章节范围（包含上一次的章节）
             const currentStart = Math.max(1, currentReadChapter - chaptersPerUpdate + 1);
             const currentEnd = Math.min(currentReadChapter, book.totalChapters);
             
             chapters = allChapters.filter(chapter => 
               chapter.chapterNumber >= currentStart && chapter.chapterNumber <= currentEnd
             );
           }
         }
       }

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
   * 获取文件格式对应的MIME类型
   */
  private getFileFormatMimeType(fileFormat: string): string {
    const formatToMime: { [key: string]: string } = {
      'epub': 'application/epub+zip',
      'pdf': 'application/pdf',
      'mobi': 'application/x-mobipocket-ebook',
      'azw': 'application/vnd.amazon.ebook',
      'azw3': 'application/x-kindle-application',
      'chm': 'application/vnd.ms-htmlhelp',
      'fb2': 'application/x-fictionbook+xml',
      'ncx': 'application/x-dtbncx+xml',
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
    };
    return formatToMime[fileFormat] || 'application/octet-stream';
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
      
      // 对于OPDS书籍，不需要解析文件，因为在创建时已经有默认章节
      if (book.sourceType === 'opds') {
        console.log(`书籍${bookId}是OPDS类型，应该已有默认章节，标记为完成`);
        await BookRssConfig.update(
          { parseStatus: 'completed', lastParseTime: new Date() },
          { where: { id: configId } }
        );
        return;
      }
      
      if (!book.sourcePath) {
        throw new Error(`书籍${bookId}缺少文件路径`);
      }
      
      // 调用BookService的解析方法
      const mimeType = this.getFileFormatMimeType(book.fileFormat || 'unknown');
      const parseResult = await this.bookService.parseBookFile(book.sourcePath, mimeType);
      
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