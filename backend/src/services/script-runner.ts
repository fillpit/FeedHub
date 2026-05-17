import { ScriptContext, ScriptResult, FeedItem } from "../types/feed";
import vm from "node:vm";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import util from "node:util";

const SCRIPTS_BASE_DIR = process.env.SCRIPTS_DIR
  || path.join(process.env.ELECTRON_USER_DATA || process.cwd(), "data", "scripts");

/**
 * 执行用户脚本，返回 feed 订阅源对象
 * 使用 Node.js 原生 vm 模块，支持 require NPM 包
 */
export async function runScript({
  scriptFolder,
  context,
  timeoutMs = 30000,
}: {
  scriptFolder: string;
  context: ScriptContext;
  timeoutMs?: number;
}): Promise<ScriptResult> {
  const startTime = Date.now();
  const logs: Array<{ level: string; message: string }> = [];

  logs.push({
    level: "info",
    message: `[流程日志] 接收的参数: ${util.inspect(context.params, { compact: true })}`,
  });

  const scriptDir = path.join(SCRIPTS_BASE_DIR, scriptFolder);
  const mainFile = resolveMainFile(scriptDir);

  if (!mainFile) {
    return { success: false, error: "脚本入口文件不存在", logs, executionTime: 0 };
  }

  const code = fs.readFileSync(mainFile, "utf-8");

  try {
    const result = await executeInVm(code, context, logs, scriptDir, mainFile, timeoutMs);
    const feedData = normalizeResult(result);
    logs.push({ level: "info", message: `[流程日志] 返回 RSS 结果: [${feedData.title}] 共 ${feedData.items.length} 条数据` });
    return {
      success: true,
      data: feedData,
      logs,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message, logs, executionTime: Date.now() - startTime };
  }
}

async function executeInVm(
  code: string,
  context: ScriptContext,
  logs: Array<{ level: string; message: string }>,
  scriptDir: string,
  mainFile: string,
  timeoutMs: number,
): Promise<unknown> {
  const customRequire = createRequire(mainFile);

  const _log = (level: string, ...args: unknown[]) => {
    const message = args.map(arg => {
      if (typeof arg === "object" && arg !== null) {
        try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
      }
      return String(arg);
    }).join(" ");
    logs.push({ level, message });
  };

  const sandbox = {
    require: customRequire,
    console: {
      log: (...args: unknown[]) => _log("info", ...args),
      warn: (...args: unknown[]) => _log("warn", ...args),
      error: (...args: unknown[]) => _log("error", ...args),
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    Headers,
    Buffer,
    process: { env: {} }, // 提供空 env 避免某些包报错
    params: context.params ?? {},
    routeParams: context.routeParams ?? {},
    authInfo: context.authInfo ?? {},
    fetch: async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof url === "object" && "url" in url ? (url as Request).url : String(url);
      const method = init?.method ?? "GET";
      logs.push({ level: "info", message: `[流程日志] 请求目标接口 (${method}): ${urlStr}` });
      if (init?.body || init?.headers) {
        logs.push({
          level: "info",
          message: `[流程日志] 请求配置: ${util.inspect({ headers: init.headers, body: init.body }, { compact: true })}`,
        });
      }
      const res = await globalThis.fetch(url, init);
      logs.push({ level: "info", message: `[流程日志] 接口返回状态: ${res.status} ${res.statusText}` });

      // 记录响应数据（克隆一份用于打印）
      const cloneRes = res.clone();
      try {
        const text = await cloneRes.text();
        try {
          const json = JSON.parse(text);
          const snippet = util.inspect(json, { depth: 2, compact: true, breakLength: 100 });
          const trimmed = snippet.length > 800 ? snippet.slice(0, 800) + "..." : snippet;
          logs.push({ level: "info", message: `[流程日志] 接口响应数据 (JSON 截取): ${trimmed}` });
        } catch {
          const trimmed = text.length > 500 ? text.slice(0, 500) + "..." : text;
          logs.push({ level: "info", message: `[流程日志] 接口响应数据 (文本截取): ${trimmed}` });
        }
      } catch {
        logs.push({ level: "warn", message: `[流程日志] 无法读取接口响应数据` });
      }

      return res;
    },
    hub: {
      date: {
        parse: (raw: unknown) => {
          if (!raw) return new Date().toISOString();
          const str = String(raw).trim();
          const now = new Date();
          if (/^\d{10,13}$/.test(str)) {
            const ms = str.length === 10 ? Number(str) * 1000 : Number(str);
            return new Date(ms).toISOString();
          }
          if (str.includes("刚刚")) return now.toISOString();
          if (str.includes("秒前")) {
            const m = str.match(/(\d+)\s*秒前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 1000).toISOString();
          }
          if (str.includes("分钟前")) {
            const m = str.match(/(\d+)\s*分钟前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 60000).toISOString();
          }
          if (str.includes("小时前")) {
            const m = str.match(/(\d+)\s*小时前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 3600000).toISOString();
          }
          if (str.includes("天前")) {
            const m = str.match(/(\d+)\s*天前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 86400000).toISOString();
          }
          if (str.includes("昨天")) {
            const y = new Date(now.getTime() - 86400000);
            const m = str.match(/\d{1,2}:\d{1,2}/);
            const t = m ? " " + m[0] : "";
            const parsed = new Date(y.getFullYear() + "/" + (y.getMonth() + 1) + "/" + y.getDate() + t);
            return (!isNaN(parsed.getTime()) ? parsed : y).toISOString();
          }
          const cleanStr = str.replace(/[年月]/g, "-").replace(/日/g, "");
          const parsed = new Date(cleanStr);
          return (!isNaN(parsed.getTime()) ? parsed : now).toISOString();
        }
      },
    }
  };

  vm.createContext(sandbox);

  const wrappedCode = `
    (async () => {
      try {
        const _res = await (async () => {
          ${code}
        })();
        return JSON.stringify({ success: true, data: _res ?? null });
      } catch (err) {
        return JSON.stringify({ success: false, error: String(err.stack || err.message || err) });
      }
    })()
  `;

  const script = new vm.Script(wrappedCode, { filename: "main.js" });
  const rawStr = await script.runInContext(sandbox, { timeout: timeoutMs, displayErrors: true }) as string;
  const resultObj = JSON.parse(rawStr);
  if (!resultObj.success) {
    throw new Error(resultObj.error);
  }
  return resultObj.data;
}

function resolveMainFile(scriptDir: string): string | null {
  const pkgPath = path.join(scriptDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    if (pkg.main) {
      const mainPath = path.join(scriptDir, pkg.main);
      if (fs.existsSync(mainPath)) return mainPath;
    }
  }
  const candidates = ["main.js", "index.js"];
  for (const name of candidates) {
    const candidate = path.join(scriptDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function normalizeResult(raw: unknown): { title: string; description?: string; link?: string; items: FeedItem[] } {
  if (Array.isArray(raw)) {
    return { title: "FeedHub", items: normalizeItems(raw) };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const title = obj.title ? String(obj.title) : "FeedHub";
    const description = obj.description ? String(obj.description) : undefined;
    const link = obj.link ? String(obj.link) : undefined;
    const items = normalizeItems(obj.items);
    return { title, description, link, items };
  }
  return { title: "FeedHub", items: [] };
}

function normalizeItems(raw: unknown): FeedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item && typeof item === "object")
    .map((item) => ({
      title: String(item.title ?? ""),
      link: String(item.link ?? item.url ?? ""),
      content: item.content != null ? String(item.content) : undefined,
      author: item.author != null ? String(item.author) : undefined,
      pubDate: item.pubDate != null ? String(item.pubDate) : undefined,
      guid: item.guid != null ? String(item.guid) : String(item.link ?? item.url ?? ""),
    }));
}

export function ensureScriptsDir(): void {
  if (!fs.existsSync(SCRIPTS_BASE_DIR)) {
    fs.mkdirSync(SCRIPTS_BASE_DIR, { recursive: true });
  }
}

export { SCRIPTS_BASE_DIR };
