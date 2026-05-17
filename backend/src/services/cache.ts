import { getDb } from "../db/schema";
import Redis from "ioredis";

/**
 * 缓存服务：优先 Redis，无 Redis 配置则降级为内存 Map
 */

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt < now) memoryStore.delete(key);
  }
}

export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

const memoryCacheService: CacheService = {
  async get(key) {
    pruneExpired();
    const entry = memoryStore.get(key);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.value;
  },
  async set(key, value, ttlSeconds) {
    memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },
  async deletePattern(pattern) {
    const prefix = pattern.replace(/\*$/, "");
    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) memoryStore.delete(key);
    }
  },
};

let resolvedService: CacheService | null = null;

export async function getCacheService(): Promise<CacheService> {
  if (resolvedService) return resolvedService;

  const db = getDb();
  
  // 从数据库读取配置
  const enabledSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'redis_enabled'").get() as { value: string } | undefined;
  const isEnabled = enabledSetting?.value === "1";

  if (!isEnabled) {
    resolvedService = memoryCacheService;
    console.log("[Cache] 使用内存缓存 (Redis 未启用)");
    return resolvedService;
  }

  const urlSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'redis_url'").get() as { value: string } | undefined;
  const redisUrl = urlSetting?.value || process.env.REDIS_URL || "redis://localhost:6379";

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying after 3 times
        return Math.min(times * 100, 2000);
      }
    });

    client.on("error", (err) => {
      console.error("Redis Error:", err.message);
    });

    resolvedService = {
      async get(key) {
        return client.get(key);
      },
      async set(key, value, ttlSeconds) {
        await client.set(key, value, "EX", ttlSeconds);
      },
      async deletePattern(pattern) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) await client.del(keys);
      },
    };

    console.log(`[Cache] 使用 Redis 缓存 (${redisUrl})`);
    return resolvedService;
  } catch (err) {
    console.warn("[Cache] Redis 连接失败，降级为内存缓存", err);
    resolvedService = memoryCacheService;
    return resolvedService;
  }
}

export function buildCacheKey(prefix: string, parts: Record<string, unknown>): string {
  const sorted = JSON.stringify(parts, Object.keys(parts).sort());
  return `${prefix}:${Buffer.from(sorted).toString("base64")}`;
}

export async function testRedisConnection(url: string): Promise<{ success: boolean; message: string }> {
  const client = new Redis(url, {
    maxRetriesPerRequest: 0, // don't retry for testing
    connectTimeout: 5000,
  });
  
  try {
    await client.ping();
    await client.quit();
    return { success: true, message: "Redis 连接成功！" };
  } catch (err: unknown) {
    try { await client.quit(); } catch {}
    return { success: false, message: `Redis 连接失败: ${err instanceof Error ? err.message : "连接失败"}` };
  }
}

export function clearCacheServiceInstance() {
  resolvedService = null;
}
