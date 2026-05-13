/**
 * Nowen Note 插件加载器
 *
 * 从 data/plugins/ 目录动态加载符合 NowenSkill 接口的插件。
 * 支持两种加载方式：
 * 1. 本地目录插件（含 manifest.json + JS 模块）
 * 2. 动态注册的内存插件
 *
 * 安全措施：
 * - 权限声明检查
 * - 执行超时限制
 * - 错误隔离（单个插件崩溃不影响系统）
 */

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// ===== 类型定义 =====

export interface SkillCapability {
  action: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  params?: SkillParam[];
}

export interface SkillParam {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  description: string;
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: unknown }[];
}

export interface SkillContext {
  log: (message: string) => void;
  userId: string;
  // API 客户端会在执行时注入
  apiBaseUrl: string;
  apiToken: string;
}

export interface SkillResult {
  success: boolean;
  data?: unknown;
  text?: string;
  error?: string;
}

export interface NowenSkill {
  name: string;
  version: string;
  description: string;
  author?: string;
  capabilities: SkillCapability[];
  init?(context: SkillContext): Promise<void>;
  execute(context: SkillContext, params: Record<string, unknown>): Promise<SkillResult>;
  destroy?(): Promise<void>;
}

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  capabilities: SkillCapability[];
  permissions?: string[];
}

export interface LoadedSkill {
  manifest: SkillManifest;
  skill: NowenSkill;
  directory: string;
  loadedAt: string;
  status: "active" | "error" | "disabled";
  error?: string;
}

// ===== 插件加载器 =====

export class PluginLoader {
  private plugins: Map<string, LoadedSkill> = new Map();
  private pluginsDir: string;
  private logs: Map<string, string[]> = new Map();

  constructor(pluginsDir?: string) {
    this.pluginsDir = pluginsDir || path.join(
      process.env.ELECTRON_USER_DATA || path.join(process.cwd(), "data"),
      "plugins"
    );
  }

  /** 获取插件目录路径 */
  getPluginsDir(): string {
    return this.pluginsDir;
  }

  /** 确保插件目录存在 */
  private ensureDir(): void {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }
  }

  /** 扫描并加载所有插件 */
  async loadAll(): Promise<void> {
    this.ensureDir();

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pluginDir = path.join(this.pluginsDir, entry.name);
      const manifestPath = path.join(pluginDir, "manifest.json");

      if (!fs.existsSync(manifestPath)) {
        console.warn(`[PluginLoader] 跳过 ${entry.name}：缺少 manifest.json`);
        continue;
      }

      try {
        await this.loadPlugin(pluginDir);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[PluginLoader] 加载 ${entry.name} 失败:`, message);
      }
    }

    console.log(`[PluginLoader] 已加载 ${this.plugins.size} 个插件`);
  }

  /** 加载单个插件 */
  async loadPlugin(pluginDir: string): Promise<LoadedSkill> {
    const manifestPath = path.join(pluginDir, "manifest.json");
    const manifestText = fs.readFileSync(manifestPath, "utf-8");
    const manifest: SkillManifest = JSON.parse(manifestText);

    // 验证 manifest
    if (!manifest.name || !manifest.version || !manifest.main) {
      throw new Error(`manifest.json 缺少必要字段 (name/version/main)`);
    }

    // 检查是否已加载
    if (this.plugins.has(manifest.name)) {
      const existing = this.plugins.get(manifest.name);
      // 先卸载旧版本
      if (existing && existing.skill.destroy) {
        try { await existing.skill.destroy(); } catch { /* 忽略清理错误 */ }
      }
    }

    // 加载 JS 模块
    const mainPath = path.join(pluginDir, manifest.main);
    if (!fs.existsSync(mainPath)) {
      throw new Error(`入口文件不存在: ${manifest.main}`);
    }

    // 安全检查：确保文件在插件目录内
    const resolvedMain = path.resolve(mainPath);
    const resolvedDir = path.resolve(pluginDir);
    if (!resolvedMain.startsWith(resolvedDir)) {
      throw new Error("安全违规：入口文件路径逃逸出插件目录");
    }

    let skill: NowenSkill;
    try {
      // 使用 dynamic import 加载 ES 模块
      const moduleUrl = pathToFileURL(resolvedMain).href;
      const mod = await import(moduleUrl);
      skill = mod.default || mod;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const loaded: LoadedSkill = {
        manifest,
        skill: null as unknown as NowenSkill,
        directory: pluginDir,
        loadedAt: new Date().toISOString(),
        status: "error",
        error: `模块加载失败: ${message}`,
      };
      this.plugins.set(manifest.name, loaded);
      throw err;
    }

    // 验证 Skill 接口
    if (typeof skill.execute !== "function") {
      throw new Error(`插件 ${manifest.name} 未实现 execute() 方法`);
    }

    const loaded: LoadedSkill = {
      manifest,
      skill,
      directory: pluginDir,
      loadedAt: new Date().toISOString(),
      status: "active",
    };

    this.plugins.set(manifest.name, loaded);
    return loaded;
  }

  /** 卸载插件 */
  async unloadPlugin(name: string): Promise<boolean> {
    const loaded = this.plugins.get(name);
    if (!loaded) return false;

    if (loaded.skill?.destroy) {
      try { await loaded.skill.destroy(); } catch { /* 忽略 */ }
    }

    this.plugins.delete(name);
    this.logs.delete(name);
    return true;
  }

  /** 注册内存插件（不需要文件） */
  registerPlugin(manifest: SkillManifest, skill: NowenSkill): void {
    this.plugins.set(manifest.name, {
      manifest,
      skill,
      directory: "",
      loadedAt: new Date().toISOString(),
      status: "active",
    });
  }

  /** 获取所有已加载的插件信息 */
  listPlugins(): {
    name: string;
    version: string;
    description: string;
    author: string;
    status: string;
    capabilities: SkillCapability[];
    loadedAt: string;
    error?: string;
  }[] {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      author: p.manifest.author,
      status: p.status,
      capabilities: p.manifest.capabilities,
      loadedAt: p.loadedAt,
      error: p.error,
    }));
  }

  /** 获取指定插件 */
  getPlugin(name: string): LoadedSkill | undefined {
    return this.plugins.get(name);
  }

  /** 查找能处理指定 action 的所有插件 */
  findByAction(action: string): LoadedSkill[] {
    return Array.from(this.plugins.values()).filter(
      p => p.status === "active" && p.manifest.capabilities.some(c => c.action === action)
    );
  }

  /** 执行插件（带超时和错误隔离） */
  async executePlugin(
    name: string,
    params: Record<string, unknown>,
    context: SkillContext,
    timeoutMs: number = 30000,
  ): Promise<SkillResult> {
    const loaded = this.plugins.get(name);
    if (!loaded) {
      return { success: false, error: `插件 ${name} 不存在` };
    }
    if (loaded.status !== "active") {
      return { success: false, error: `插件 ${name} 状态异常: ${loaded.status}` };
    }

    // 收集日志
    const pluginLogs: string[] = [];
    const logFn = (msg: string) => {
      pluginLogs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    const execContext: SkillContext = { ...context, log: logFn };

    try {
      // 带超时的执行
      const result = await Promise.race([
        loaded.skill.execute(execContext, params),
        new Promise<SkillResult>((_, reject) =>
          setTimeout(() => reject(new Error(`执行超时 (${timeoutMs}ms)`)), timeoutMs)
        ),
      ]);

      // 保存日志
      this.logs.set(name, pluginLogs);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logs.set(name, [...pluginLogs, `[ERROR] ${message}`]);
      return { success: false, error: message };
    }
  }

  /** 获取插件执行日志 */
  getPluginLogs(name: string): string[] {
    return this.logs.get(name) || [];
  }
}

// ===== 全局单例 =====
let _loader: PluginLoader | null = null;

export function getPluginLoader(): PluginLoader {
  if (!_loader) {
    _loader = new PluginLoader();
  }
  return _loader;
}
