import { injectable, inject } from "inversify";
import { ApiResponseData } from "../utils/apiResponse";
import BookRssConfig from "../models/BookRssConfigModel";
import { BookRssConfigAttributes, BookRssConfigCreationAttributes } from "../models/BookRssConfigModel";
import GlobalSetting from "../models/GlobalSetting";
import { BookRssConfig as BookRssConfigInterface, Book, Chapter } from '@feedhub/shared/src/types/bookRss';
import { OpdsService } from "./OpdsService";
import { ChapterService } from "./ChapterService";
import BookModel from "../models/Book";
import { TYPES } from "../core/types";

@injectable()
export class BookRssService {
  constructor(
    @inject(TYPES.OpdsService) private opdsService: OpdsService,
    @inject(TYPES.ChapterService) private chapterService: ChapterService
  ) {}
  /**
   * 获取所有图书RSS配置
   */
  async getAllConfigs(): Promise<ApiResponseData<BookRssConfigInterface[]>> {
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
    const globalSetting = await GlobalSetting.findOne();
    
    // 将全局OPDS设置注入到每个配置中，并添加书籍信息
    const configsWithGlobalOpds = configs.map(config => {
      const configData = config.toJSON() as any;
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
      
      return configData;
    });
    
    return { success: true, data: configsWithGlobalOpds, message: "获取图书RSS配置列表成功" };
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
      maxChapters: configData.maxChapters || 50
    });
    
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
    
    await config.update(updateData);
    
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

       // 获取章节列表
        const maxChapters = config.maxChapters || 50;
        const chaptersResult = await this.chapterService.getChaptersByBookId(config.bookId, {
          page: 1,
          limit: maxChapters,
          sortBy: 'chapterNumber',
          sortOrder: 'desc' // 最新的在前
        });
        
        if (!chaptersResult.success || !chaptersResult.data) {
          return { chapters: [], book: book.toJSON() as Book };
        }

        const chapters = chaptersResult.data.list;
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
    <ttl>${config.updateInterval || 60}</ttl>
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
}