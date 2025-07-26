import { createClient, RedisClientType } from 'redis';
import { ICacheService } from './ICacheService';
import { logger } from '../../utils/logger';

/**
 * Redis缓存服务实现
 */
export class RedisCacheService implements ICacheService {
  private client: RedisClientType;
  private isConnected = false;

  constructor(redisUrl: string) {
    this.client = createClient({
      url: redisUrl
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  /**
   * 连接到Redis
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis cache service initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, returning null for key:', key);
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping set for key:', key);
      return;
    }

    try {
      await this.client.setEx(key, ttlSeconds, value);
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping delete for key:', key);
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping deletePattern for pattern:', pattern);
      return;
    }

    try {
      // 将通配符模式转换为Redis模式
      const redisPattern = pattern.replace(/\*/g, '*');
      const keys = await this.client.keys(redisPattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Redis cache: Deleted ${keys.length} entries matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error('Redis deletePattern error:', error);
    }
  }

  async cleanExpired(): Promise<void> {
    // Redis自动处理过期键，无需手动清理
    // 这里可以记录一些统计信息
    logger.debug('Redis handles expiration automatically');
  }

  async close(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    if (!this.isConnected) {
      return {
        size: 0,
        type: 'redis',
        connected: false
      };
    }

    try {
      const info = await this.client.info('keyspace');
      // 解析keyspace信息获取键数量
      const dbMatch = info.match(/db0:keys=(\d+)/);
      const keyCount = dbMatch ? parseInt(dbMatch[1]) : 0;
      
      return {
        size: keyCount,
        type: 'redis',
        connected: true
      };
    } catch (error) {
      logger.error('Error getting Redis stats:', error);
      return {
        size: 0,
        type: 'redis',
        connected: false
      };
    }
  }
}