/**
 * 缓存服务接口
 */
export interface ICacheService {
  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期则返回null
   */
  get(key: string): Promise<string | null>;

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlSeconds 过期时间（秒）
   */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;

  /**
   * 删除匹配模式的缓存
   * @param pattern 匹配模式
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * 清理过期缓存
   */
  cleanExpired(): Promise<void>;

  /**
   * 关闭缓存连接
   */
  close(): Promise<void>;
}

/**
 * 缓存条目接口
 */
export interface CacheEntry {
  data: string;
  timestamp: number;
  expiresAt: number;
}
