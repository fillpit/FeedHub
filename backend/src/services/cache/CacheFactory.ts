import { ICacheService } from './ICacheService';
import { MemoryCacheService } from './MemoryCacheService';
import { RedisCacheService } from './RedisCacheService';
import { logger } from '../../utils/logger';

/**
 * 缓存工厂类
 * 根据环境变量自动选择缓存实现
 */
export class CacheFactory {
  private static instance: ICacheService | null = null;

  /**
   * 创建缓存服务实例
   * @returns 缓存服务实例
   */
  static async createCacheService(): Promise<ICacheService> {
    if (this.instance) {
      return this.instance;
    }

    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      logger.info('Redis URL detected, initializing Redis cache service');
      try {
        const redisCacheService = new RedisCacheService(redisUrl);
        await redisCacheService.connect();
        this.instance = redisCacheService;
        logger.info('Redis cache service initialized successfully');
        return this.instance;
      } catch (error) {
        logger.error('Failed to initialize Redis cache service, falling back to memory cache:', error);
        // 如果Redis连接失败，回退到内存缓存
      }
    } else {
      logger.info('No Redis URL found in environment variables');
    }

    logger.info('Initializing memory cache service');
    this.instance = new MemoryCacheService();
    logger.info('Memory cache service initialized successfully');
    return this.instance;
  }

  /**
   * 获取当前缓存服务实例
   * @returns 缓存服务实例，如果未初始化则返回null
   */
  static getInstance(): ICacheService | null {
    return this.instance;
  }

  /**
   * 关闭缓存服务
   */
  static async closeCacheService(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      logger.info('Cache service closed');
    }
  }

  /**
   * 重置缓存服务（主要用于测试）
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * 获取缓存服务实例的便捷函数
 */
export async function getCacheService(): Promise<ICacheService> {
  return await CacheFactory.createCacheService();
}