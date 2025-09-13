// 存储键常量
const STORAGE_KEYS = {
  TOKEN: "token",
  USER_INFO: "userInfo",
  THEME: "theme",
  LANGUAGE: "language",
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
  RSS_CONFIGS: "rssConfigs",
  RECENT_SEARCHES: "recentSearches",
  FORM_DRAFTS: "formDrafts",
};

// 存储值类型定义
interface StorageValue {
  data: unknown;
  timestamp: number;
  expires?: number; // 过期时间（毫秒）
}

// 存储配置
interface StorageConfig {
  expires?: number; // 过期时间（毫秒）
  encrypt?: boolean; // 是否加密
  compress?: boolean; // 是否压缩
}

// 简单的加密/解密函数（仅用于基本混淆，不适用于敏感数据）
const simpleEncrypt = (text: string): string => {
  return btoa(encodeURIComponent(text));
};

const simpleDecrypt = (encrypted: string): string => {
  try {
    return decodeURIComponent(atob(encrypted));
  } catch {
    return encrypted; // 解密失败时返回原文
  }
};

// 压缩/解压缩函数（简单的JSON字符串压缩）
const compress = (data: unknown): string => {
  const jsonString = JSON.stringify(data);
  // 简单的重复字符压缩
  return jsonString.replace(/"([^"]+)":/g, (match, key) => {
    if (key.length > 3) {
      return `"${key.substring(0, 3)}...":`;
    }
    return match;
  });
};

const decompress = (compressed: string): unknown => {
  try {
    return JSON.parse(compressed);
  } catch {
    return compressed;
  }
};

// 存储管理类
class StorageManager {
  private storage: Storage;
  private prefix: string;

  constructor(storage: Storage = localStorage.storage, prefix: string = "feedhub_") {
    this.storage = storage;
    this.prefix = prefix;
  }

  // 生成完整的键名
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // 设置存储值
  set<T>(key: string, value: T, config?: StorageConfig): boolean {
    try {
      const storageValue: StorageValue = {
        data: value,
        timestamp: Date.now(),
        expires: config?.expires,
      };

      let serialized = JSON.stringify(storageValue);

      // 压缩
      if (config?.compress) {
        serialized = compress(serialized);
      }

      // 加密
      if (config?.encrypt) {
        serialized = simpleEncrypt(serialized);
      }

      this.storage.setItem(this.getFullKey(key), serialized);
      return true;
    } catch (error) {
      console.error(`存储设置失败 [${key}]:`, error);
      return false;
    }
  }

  // 获取存储值
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const fullKey = this.getFullKey(key);
      let serialized = this.storage.getItem(fullKey);

      if (!serialized) {
        return defaultValue;
      }

      // 尝试解密
      if (serialized.indexOf("{") !== 0) {
        serialized = simpleDecrypt(serialized);
      }

      // 尝试解压缩
      let storageValue: StorageValue;
      try {
        storageValue = JSON.parse(serialized) as StorageValue;
      } catch {
        // 如果解析失败，尝试解压缩后再解析
        const decompressed = decompress(serialized);
        storageValue = decompressed as StorageValue;
      }

      // 检查是否过期
      if (storageValue.expires) {
        const now = Date.now();
        if (now - storageValue.timestamp > storageValue.expires) {
          this.remove(key);
          return defaultValue;
        }
      }

      return storageValue.data as T;
    } catch (error) {
      console.error(`存储获取失败 [${key}]:`, error);
      return defaultValue;
    }
  }

  // 删除存储值
  remove(key: string): boolean {
    try {
      this.storage.removeItem(this.getFullKey(key));
      return true;
    } catch (error) {
      console.error(`存储删除失败 [${key}]:`, error);
      return false;
    }
  }

  // 检查键是否存在
  has(key: string): boolean {
    return this.storage.getItem(this.getFullKey(key)) !== null;
  }

  // 清除所有带前缀的存储
  clear(): boolean {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => this.storage.removeItem(key));
      return true;
    } catch (error) {
      console.error("存储清除失败:", error);
      return false;
    }
  }

  // 获取所有键
  keys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
    } catch (error) {
      console.error("获取存储键失败:", error);
    }
    return keys;
  }

  // 获取存储大小（估算）
  getSize(): number {
    let size = 0;
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = this.storage.getItem(key);
          if (value) {
            size += key.length + value.length;
          }
        }
      }
    } catch (error) {
      console.error("计算存储大小失败:", error);
    }
    return size;
  }

  // 清理过期数据
  cleanup(): number {
    let cleanedCount = 0;
    try {
      const keys = this.keys();
      keys.forEach((key) => {
        const value = this.get(key);
        if (value === undefined) {
          cleanedCount++;
        }
      });
    } catch (error) {
      console.error("清理过期数据失败:", error);
    }
    return cleanedCount;
  }
}

// 创建默认实例
const localStorage = new StorageManager(window.localStorage);
const sessionStorage = new StorageManager(window.sessionStorage, "feedhub_session_");

// 类型安全的存储接口
interface TypedStorage {
  // 用户相关
  token: string;
  userInfo: {
    id: number;
    username: string;
    role: number;
  };

  // 应用设置
  theme: "light" | "dark" | "auto";
  language: "zh-CN" | "en-US";
  sidebarCollapsed: boolean;

  // 业务数据缓存
  rssConfigs: unknown[];
  recentSearches: string[];

  // 临时数据
  formDrafts: Record<string, unknown>;
}

// 类型安全的存储操作
class TypedStorageManager {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  // 设置令牌
  setToken(token: string): boolean {
    return this.storage.set(STORAGE_KEYS.TOKEN, token, {
      encrypt: true,
      expires: 7 * 24 * 60 * 60 * 1000, // 7天
    });
  }

  // 获取令牌
  getToken(): string | undefined {
    return this.storage.get<string>(STORAGE_KEYS.TOKEN);
  }

  // 清除令牌
  clearToken(): boolean {
    return this.storage.remove(STORAGE_KEYS.TOKEN);
  }

  // 设置用户信息
  setUserInfo(userInfo: TypedStorage["userInfo"]): boolean {
    return this.storage.set("userInfo", userInfo, {
      encrypt: true,
      expires: 7 * 24 * 60 * 60 * 1000, // 7天
    });
  }

  // 获取用户信息
  getUserInfo(): TypedStorage["userInfo"] | undefined {
    return this.storage.get<TypedStorage["userInfo"]>("userInfo");
  }

  // 清除用户信息
  clearUserInfo(): boolean {
    return this.storage.remove("userInfo");
  }

  // 设置主题
  setTheme(theme: TypedStorage["theme"]): boolean {
    return this.storage.set("theme", theme);
  }

  // 获取主题
  getTheme(): TypedStorage["theme"] {
    const theme = this.storage.get<TypedStorage["theme"]>("theme", "auto");
    return theme ?? "auto";
  }

  // 设置语言
  setLanguage(language: TypedStorage["language"]): boolean {
    return this.storage.set("language", language);
  }

  // 获取语言
  getLanguage(): TypedStorage["language"] {
    const language = this.storage.get<TypedStorage["language"]>("language", "zh-CN");
    return language ?? "zh-CN";
  }

  // 设置侧边栏状态
  setSidebarCollapsed(collapsed: boolean): boolean {
    return this.storage.set("sidebarCollapsed", collapsed);
  }

  // 获取侧边栏状态
  getSidebarCollapsed(): boolean {
    const collapsed = this.storage.get<boolean>("sidebarCollapsed", false);
    return collapsed ?? false;
  }

  // 缓存RSS配置
  cacheRssConfigs(configs: unknown[]): boolean {
    return this.storage.set("rssConfigs", configs, {
      compress: true,
      expires: 30 * 60 * 1000, // 30分钟
    });
  }

  // 获取缓存的RSS配置
  getCachedRssConfigs(): unknown[] {
    const configs = this.storage.get<unknown[]>("rssConfigs", []);
    return configs ?? [];
  }

  // 添加搜索历史
  addRecentSearch(search: string): boolean {
    const recent = this.getRecentSearches();
    const filtered = recent.filter((item) => item !== search);
    filtered.unshift(search);
    const limited = filtered.slice(0, 10); // 最多保存10条
    return this.storage.set("recentSearches", limited);
  }

  // 获取搜索历史
  getRecentSearches(): string[] {
    const recent = this.storage.get<string[]>("recentSearches", []);
    return recent ?? [];
  }

  // 保存表单草稿
  saveFormDraft(formId: string, data: unknown): boolean {
    const drafts = this.getFormDrafts();
    drafts[formId] = {
      data,
      timestamp: Date.now(),
    };
    return this.storage.set("formDrafts", drafts, {
      expires: 24 * 60 * 60 * 1000, // 24小时
    });
  }

  // 获取表单草稿
  getFormDraft(formId: string): unknown {
    const drafts = this.getFormDrafts();
    const draft = drafts[formId] as { data: unknown; timestamp: number } | undefined;
    return draft?.data;
  }

  // 获取所有表单草稿
  getFormDrafts(): Record<string, unknown> {
    const drafts = this.storage.get<Record<string, unknown>>("formDrafts", {});
    return drafts ?? {};
  }

  // 删除表单草稿
  removeFormDraft(formId: string): boolean {
    const drafts = this.getFormDrafts();
    delete drafts[formId];
    return this.storage.set("formDrafts", drafts);
  }

  // 清除所有数据
  clearAll(): boolean {
    return this.storage.clear();
  }

  // 清理过期数据
  cleanup(): number {
    return this.storage.cleanup();
  }
}

// 创建类型安全的存储实例
const typedLocalStorage = new TypedStorageManager(localStorage);
const typedSessionStorage = new TypedStorageManager(sessionStorage);

// 自动清理过期数据（每小时执行一次）
setInterval(
  () => {
    try {
      const cleaned = typedLocalStorage.cleanup();
      if (cleaned > 0) {
        console.log(`已清理 ${cleaned} 条过期数据`);
      }
    } catch (error) {
      console.error("自动清理失败:", error);
    }
  },
  60 * 60 * 1000
);

// 导出
export {
  StorageManager,
  TypedStorageManager,
  typedLocalStorage as localStorage,
  typedSessionStorage as sessionStorage,
};

export default typedLocalStorage;
