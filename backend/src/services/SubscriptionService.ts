import { injectable } from "inversify";
import { v4 as uuidv4 } from "uuid";
import Book from "../models/Book";
import Chapter from "../models/Chapter";
import Subscription from "../models/Subscription";
import {
  Subscription as SubscriptionInterface,
  SubscriptionItem,
  SubscriptionFeed,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "@feedhub/shared";

@injectable()
export class SubscriptionService {
  /**
   * 创建订阅
   */
  async createSubscription(
    bookId: number,
    subscriptionData: Partial<SubscriptionInterface>
  ) {
    try {
      // 检查书籍是否存在
      const book = await Book.findByPk(bookId);
      if (!book) {
        return {
          success: false,
          error: `未找到ID为${bookId}的书籍`,
        };
      }

      // 生成唯一的订阅key
      const subscriptionKey = uuidv4();

      const subscription = await Subscription.create({
        bookId,
        subscriptionKey,
        title: subscriptionData.title || `${book.title} - 章节订阅`,
        description: subscriptionData.description || `${book.title}的最新章节更新`,
        format: subscriptionData.format || 'rss',
        includeContent: subscriptionData.includeContent ?? true,
        maxItems: subscriptionData.maxItems || 20,
        isActive: true,
        accessCount: 0,
        ...subscriptionData,
      });

      return {
        success: true,
        data: subscription,
        message: "订阅创建成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `创建订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 获取订阅列表
   */
  async getSubscriptions(params?: PaginationParams) {
    try {
      const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = params || {};
      const offset = (page - 1) * limit;

      const { count, rows } = await Subscription.findAndCountAll({
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        include: [
          {
            model: Book,
            as: 'book',
            attributes: ['id', 'title', 'author', 'totalChapters', 'lastChapterTitle'],
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
        message: "获取订阅列表成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `获取订阅列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 根据订阅key获取RSS/JSON feed
   */
  async getFeedByKey(subscriptionKey: string, format?: 'rss' | 'json') {
    try {
      const subscription = await Subscription.findOne({
        where: { subscriptionKey, isActive: true },
      });

      if (!subscription) {
        return {
          success: false,
          error: "未找到有效的订阅",
        };
      }

      const subscriptionWithBook = await Subscription.findOne({
        where: { subscriptionKey, isActive: true },
        include: [
          {
            model: Book,
            as: 'book',
            include: [
              {
                model: Chapter,
                as: 'chapters',
                order: [['chapterNumber', 'DESC']],
                limit: subscription.maxItems || 20,
              },
            ],
          },
        ],
      });

      if (!subscriptionWithBook) {
        return {
          success: false,
          error: "未找到有效的订阅",
        };
      }

      // 更新访问统计
      await subscription.update({
        lastAccessTime: new Date(),
        accessCount: subscription.accessCount + 1,
      });

      const feedFormat = format || subscription.format;
      const feedData = this.generateFeedData(subscriptionWithBook);

      if (feedFormat === 'json') {
        return {
          success: true,
          data: feedData,
          message: "获取JSON feed成功",
        };
      } else {
        const rssXml = this.generateRssXml(feedData);
        return {
          success: true,
          data: rssXml,
          message: "获取RSS feed成功",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `获取feed失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 生成feed数据
   */
  private generateFeedData(subscription: any): SubscriptionFeed {
    const book = subscription.book;
    const chapters = book.chapters || [];

    const items: SubscriptionItem[] = chapters.map((chapter: any) => ({
      id: chapter.id.toString(),
      title: chapter.title,
      description: subscription.includeContent ? chapter.content : `${book.title} - ${chapter.title}`,
      link: `${process.env.BASE_URL || 'http://localhost:3000'}/books/${book.id}/chapters/${chapter.id}`,
      pubDate: chapter.publishTime.toISOString(),
      guid: `${book.id}-${chapter.id}`,
      isNew: chapter.isNew,
    }));

    return {
      title: subscription.title,
      description: subscription.description,
      link: `${process.env.BASE_URL || 'http://localhost:3000'}/books/${book.id}`,
      lastBuildDate: new Date().toISOString(),
      totalItems: items.length,
      items,
      bookInfo: {
        title: book.title,
        author: book.author,
        totalChapters: book.totalChapters,
        lastChapterTitle: book.lastChapterTitle,
      },
    };
  }

  /**
   * 生成RSS XML
   */
  private generateRssXml(feedData: SubscriptionFeed): string {
    const items = feedData.items
      .map(
        (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <description><![CDATA[${item.description}]]></description>
      <link>${item.link}</link>
      <guid isPermaLink="false">${item.guid}</guid>
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>
    </item>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${feedData.title}]]></title>
    <description><![CDATA[${feedData.description}]]></description>
    <link>${feedData.link}</link>
    <lastBuildDate>${new Date(feedData.lastBuildDate).toUTCString()}</lastBuildDate>
    <generator>FeedHub BookSubscription</generator>${items}
  </channel>
</rss>`;
  }

  /**
   * 更新订阅
   */
  async updateSubscription(
    id: number,
    updateData: Partial<SubscriptionInterface>
  ) {
    try {
      const subscription = await Subscription.findByPk(id);
      if (!subscription) {
        return {
          success: false,
          error: `未找到ID为${id}的订阅`,
        };
      }

      await subscription.update(updateData);

      return {
        success: true,
        data: subscription,
        message: "订阅更新成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `更新订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 删除订阅
   */
  async deleteSubscription(id: number) {
    try {
      const subscription = await Subscription.findByPk(id);
      if (!subscription) {
        return {
          success: false,
          error: `未找到ID为${id}的订阅`,
        };
      }

      await subscription.destroy();

      return {
        success: true,
        message: "订阅删除成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `删除订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /**
   * 根据书籍ID获取订阅
   */
  async getSubscriptionsByBookId(bookId: number) {
    try {
      const subscriptions = await Subscription.findAll({
        where: { bookId },
        order: [['createdAt', 'DESC']],
      });

      return {
        success: true,
        data: subscriptions,
        message: "获取书籍订阅成功",
      };
    } catch (error) {
      return {
        success: false,
        error: `获取书籍订阅失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }
}