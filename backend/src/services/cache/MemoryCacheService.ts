import { ICacheService, CacheEntry } from './ICacheService';
import { logger } from '../../utils/logger';

/**
 * 内存缓存服务实现
 */
export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每10分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanExpired();
    }, 10 * 60 * 1000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry = {
      data: value,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000
    };
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    let deletedCount = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      logger.info(`Memory cache: Deleted ${deletedCount} entries matching pattern: ${pattern}`);
    }
  }

  async cleanExpired(): Promise<void> {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`Memory cache: Cleaned ${cleanedCount} expired entries`);
    }
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      type: 'memory'
    };
  }
}