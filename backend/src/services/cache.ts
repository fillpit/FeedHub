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

interface RedisClient {
  connect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts: { EX: number }): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  del(keys: string[]): Promise<unknown>;
}

interface RedisModule {
  createClient(opts: { url: string }): RedisClient;
}

export async function getCacheService(): Promise<CacheService> {
  if (resolvedService) return resolvedService;

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redisModule = require("redis") as RedisModule;
      const client = redisModule.createClient({ url: redisUrl });
      await client.connect();
      resolvedService = buildRedisService(client);
      console.log("[Cache] 使用 Redis 缓存");
      return resolvedService;
    } catch {
      console.warn("[Cache] Redis 连接失败，降级为内存缓存");
    }
  }

  resolvedService = memoryCacheService;
  console.log("[Cache] 使用内存缓存");
  return resolvedService;
}

function buildRedisService(client: RedisClient): CacheService {
  return {
    async get(key) {
      return client.get(key);
    },
    async set(key, value, ttlSeconds) {
      await client.set(key, value, { EX: ttlSeconds });
    },
    async deletePattern(pattern) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) await client.del(keys);
    },
  };
}

export function buildCacheKey(prefix: string, parts: Record<string, unknown>): string {
  const sorted = JSON.stringify(parts, Object.keys(parts).sort());
  return `${prefix}:${Buffer.from(sorted).toString("base64")}`;
}
