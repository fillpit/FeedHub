import { ScriptContext, ScriptResult, FeedItem } from "../types/feed";
import ivm from "isolated-vm";
import path from "node:path";
import fs from "node:fs";
import util from "node:util";
import { npmManager } from "./npm-manager";
import { getDb } from "../db/schema";

const SCRIPTS_BASE_DIR = process.env.SCRIPTS_DIR
  || path.join(process.env.ELECTRON_USER_DATA || process.cwd(), "data", "scripts");

/**
 * 执行用户脚本，返回 feed 订阅源对象
 * 使用 isolated-vm 提供 V8 隔离沙箱
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
  const isolate = new ivm.Isolate({ memoryLimit: 128 });

  try {
    const result = await executeInIsolate(isolate, code, context, logs, scriptDir, timeoutMs);
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
  } finally {
    isolate.dispose();
  }
}

async function executeInIsolate(
  isolate: ivm.Isolate,
  code: string,
  context: ScriptContext,
  logs: Array<{ level: string; message: string }>,
  scriptDir: string,
  timeoutMs: number,
): Promise<unknown> {
  const ivmContext = await isolate.createContext();
  const jail = ivmContext.global;
  await jail.set("global", jail.derefInto());

  await injectContextData(jail, context);
  await injectHostReferences(jail, logs, scriptDir);

  const initShim = getSandboxInitShim();
  const initScript = await isolate.compileScript(initShim, { filename: "shim.js" });
  await initScript.run(ivmContext);

  const wrappedCode = `(async () => {\n  try {\n    const _res = await (async () => {\n${code}\n    })();\n    return JSON.stringify({ success: true, data: _res ?? null });\n  } catch (err) {\n    return JSON.stringify({ success: false, error: String(err.message || err) });\n  }\n})()`;
  const userScript = await isolate.compileScript(wrappedCode, { filename: "main.js" });
  const rawStr = await userScript.run(ivmContext, { promise: true, copy: true, timeout: timeoutMs }) as string;
  const resultObj = JSON.parse(rawStr);
  if (!resultObj.success) {
    throw new Error(resultObj.error);
  }
  return resultObj.data;
}

async function injectContextData(jail: ivm.Reference<Record<string, unknown>>, context: ScriptContext) {
  await jail.set("params", new ivm.ExternalCopy(context.params ?? {}).copyInto());
  await jail.set("routeParams", new ivm.ExternalCopy(context.routeParams ?? {}).copyInto());
  await jail.set("authInfo", new ivm.ExternalCopy(context.authInfo ?? {}).copyInto());
}

async function injectHostReferences(
  jail: ivm.Reference<Record<string, unknown>>,
  logs: Array<{ level: string; message: string }>,
  scriptDir: string,
) {
  await jail.set("_hostLog", new ivm.Reference((level: string, ...args: unknown[]) => {
    const message = args.map((arg) => String(arg)).join(" ");
    logs.push({ level, message });
  }));

  await jail.set("_hostFetch", new ivm.Reference(async (url: string, initStr: string) => {
    return await handleHostFetch(url, initStr, logs);
  }));

  await jail.set("_readScriptFile", new ivm.Reference((id: string) => {
    return handleHostRequire(id, scriptDir);
  }));

  await jail.set("_setTimeout", new ivm.Reference((cb: ivm.Reference, ms: number) => {
    setTimeout(() => cb.applyIgnored(undefined, []), ms);
  }));

  await jail.set("_hostRequireNpm", new ivm.Reference((id: string) => {
    // 1. 尝试从脚本本地 node_modules 加载
    const localPkgPath = path.join(scriptDir, "node_modules", id);
    try {
      if (fs.existsSync(localPkgPath)) {
        const mod = require(localPkgPath);
        return new ivm.Reference(mod);
      }
    } catch (err) {
      console.warn(`Failed to load local npm package ${id}:`, err);
    }

    // 2. 尝试从全局 NPM 环境加载
    const db = getDb();
    const pkg = db.prepare("SELECT * FROM npm_packages WHERE name = ? AND status = 'installed'").get(id);
    if (!pkg) {
      throw new Error(`NPM 包 "${id}" 未安装或未启用 (本地或全局均未找到)`);
    }
    const globalPkgPath = path.join(npmManager.getNpmEnvDir(), "node_modules", id);
    try {
      const mod = require(globalPkgPath);
      return new ivm.Reference(mod);
    } catch (err) {
      throw new Error(`加载全局 NPM 包 "${id}" 失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }));
}

async function handleHostFetch(urlStr: string, initStr: string, logs: Array<{ level: string; message: string }>) {
  const initObj = JSON.parse(initStr);
  const method = initObj?.method ?? "GET";
  logs.push({ level: "info", message: `[流程日志] 请求目标接口 (${method}): ${urlStr}` });
  if (initObj?.body || initObj?.headers) {
    logs.push({
      level: "info",
      message: `[流程日志] 请求配置: ${util.inspect({ headers: initObj.headers, body: initObj.body }, { compact: true })}`,
    });
  }

  const res = await globalThis.fetch(urlStr, initObj);
  logs.push({ level: "info", message: `[流程日志] 接口返回状态: ${res.status} ${res.statusText}` });
  await logFetchResponse(res, logs);

  const bodyText = await res.text();
  const headersObj = Object.fromEntries(res.headers.entries());

  return JSON.stringify({
    status: res.status,
    statusText: res.statusText,
    headers: headersObj,
    bodyText,
  });
}

async function logFetchResponse(res: Response, logs: Array<{ level: string; message: string }>) {
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
}

function handleHostRequire(id: string, scriptDir: string): string {
  const ALLOWED_BUILTIN = new Set(["path", "url", "querystring", "crypto", "util"]);
  if (ALLOWED_BUILTIN.has(id)) {
    throw new Error(`沙箱环境内不支持原生 Node 内置模块 require("${id}")，请使用原生 JS 语法`);
  }

  // 这里的 id 可能是相对路径也可能是包名
  // 如果是相对路径 (以 . 或 / 开头)
  if (id.startsWith(".") || id.startsWith("/")) {
    const basePath = path.resolve(scriptDir, id);
    if (!basePath.startsWith(scriptDir)) {
      throw new Error("非法的模块路径请求");
    }
    const candidates = [basePath, `${basePath}.js`, `${basePath}.ts`, path.join(basePath, "index.js")];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return fs.readFileSync(candidate, "utf-8");
      }
    }
  }

  // 如果不是相对路径，或者相对路径没找到，返回特定的错误标识，让沙箱尝试加载 NPM 包
  throw new Error(`MODULE_NOT_FOUND: ${id}`);
}

function getSandboxInitShim(): string {
  return `
    const _log = (level, ...args) => {
      const strArgs = args.map(arg => {
        if (typeof arg === "object" && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      });
      _hostLog.applySync(undefined, [level, ...strArgs]);
    };

    global.console = {
      log: (...args) => _log("info", ...args),
      warn: (...args) => _log("warn", ...args),
      error: (...args) => _log("error", ...args)
    };

    global.setTimeout = (cb, ms) => _setTimeout.applySync(undefined, [cb, ms], { arguments: { reference: true } });

    global.Headers = class Headers {
      constructor(init = {}) {
        this.map = new Map(Object.entries(init));
      }
      get(key) { return this.map.get(key); }
      set(key, val) { this.map.set(key, val); }
      entries() { return this.map.entries(); }
    };

    global.URLSearchParams = class URLSearchParams {
      constructor(init = {}) {
        this.params = [];
        if (typeof init === "string") {
          const str = init.startsWith("?") ? init.slice(1) : init;
          str.split("&").forEach(pair => {
            const [k, v] = pair.split("=");
            if (k) this.params.push([decodeURIComponent(k), decodeURIComponent(v || "")]);
          });
        } else if (Array.isArray(init)) {
          this.params = [...init];
        } else {
          Object.entries(init).forEach(([k, v]) => this.params.push([k, String(v)]));
        }
      }
      append(k, v) { this.params.push([k, String(v)]); }
      delete(k) { this.params = this.params.filter(([key]) => key !== k); }
      get(k) { const found = this.params.find(([key]) => key === k); return found ? found[1] : null; }
      getAll(k) { return this.params.filter(([key]) => key === k).map(item => item[1]); }
      has(k) { return this.params.some(([key]) => key === k); }
      set(k, v) { this.delete(k); this.append(k, v); }
      toString() { return this.params.map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&"); }
    };

    global.URL = class URL {
      constructor(url, base) {
        let fullUrl = url;
        if (base && !url.match(/^[a-zA-Z]+:\\/\\//)) {
          const baseStr = typeof base === "object" ? base.href : base;
          fullUrl = baseStr.replace(/\\/+$/, "") + "/" + url.replace(/^\\/+/, "");
        }
        const [hrefPart, hashPart] = fullUrl.split("#");
        const [originPath, searchPart] = hrefPart.split("?");
        this.href = hrefPart;
        this.hash = hashPart ? "#" + hashPart : "";
        this.search = searchPart ? "?" + searchPart : "";
        this.searchParams = new global.URLSearchParams(searchPart || "");
      }
      toString() {
        const searchStr = this.searchParams.toString();
        const [base] = this.href.split("?");
        return base + (searchStr ? "?" + searchStr : "") + this.hash;
      }
    };

    global.fetch = async (url, init) => {
      const targetUrl = typeof url === "object" ? url.url : url;
      let cleanInit = {};
      if (init) {
        let headersObj = {};
        if (init.headers) {
          if (typeof init.headers.entries === "function") {
            for (const [k, v] of init.headers.entries()) headersObj[k] = v;
          } else {
            Object.assign(headersObj, init.headers);
          }
        }
        cleanInit = {
          method: init.method ? String(init.method) : "GET",
          headers: headersObj,
          body: init.body ? String(init.body) : undefined
        };
      }
      const rawStr = await _hostFetch.apply(undefined, [targetUrl, JSON.stringify(cleanInit)], { arguments: { copy: true }, result: { promise: true, copy: true } });
      const resData = JSON.parse(rawStr);
      return {
        status: resData.status,
        statusText: resData.statusText,
        headers: new Headers(resData.headers),
        text: async () => resData.bodyText,
        json: async () => JSON.parse(resData.bodyText)
      };
    };

    global.hub = {
      date: {
        parse: (raw) => {
          if (!raw) return new Date().toISOString();
          const str = String(raw).trim();
          const now = new Date();
          if (/^\\d{10,13}$/.test(str)) {
            const ms = str.length === 10 ? Number(str) * 1000 : Number(str);
            return new Date(ms).toISOString();
          }
          if (str.includes("刚刚")) return now.toISOString();
          if (str.includes("秒前")) {
            const m = str.match(/(\\d+)\\s*秒前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 1000).toISOString();
          }
          if (str.includes("分钟前")) {
            const m = str.match(/(\\d+)\\s*分钟前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 60000).toISOString();
          }
          if (str.includes("小时前")) {
            const m = str.match(/(\\d+)\\s*小时前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 3600000).toISOString();
          }
          if (str.includes("天前")) {
            const m = str.match(/(\\d+)\\s*天前/);
            if (m) return new Date(now.getTime() - Number(m[1]) * 86400000).toISOString();
          }
          if (str.includes("昨天")) {
            const y = new Date(now.getTime() - 86400000);
            const m = str.match(/\\d{1,2}:\\d{1,2}/);
            const t = m ? " " + m[0] : "";
            const parsed = new Date(y.getFullYear() + "/" + (y.getMonth() + 1) + "/" + y.getDate() + t);
            return (!isNaN(parsed) ? parsed : y).toISOString();
          }
          const cleanStr = str.replace(/[年月]/g, "-").replace(/日/g, "");
          const parsed = new Date(cleanStr);
          return (!isNaN(parsed) ? parsed : now).toISOString();
        }
      },
      http: {
        get: async (url, params, headers = {}) => {
          let fullUrl = url;
          if (params) {
            const q = new global.URLSearchParams(params).toString();
            fullUrl += (url.includes("?") ? "&" : "?") + q;
          }
          const res = await global.fetch(fullUrl, { headers });
          return await res.json();
        },
        post: async (url, data, headers = {}) => {
          const res = await global.fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(data)
          });
          return await res.json();
        }
      }
    };

    global._requireCache = global._requireCache || {};
    global.require = (id) => {
      if (global._requireCache[id]) {
        return global._requireCache[id].exports;
      }
      
      // 尝试加载本地脚本文件
      try {
        const rawCode = _readScriptFile.applySync(undefined, [id]);
        const module = { exports: {} };
        global._requireCache[id] = module;
        const fn = new Function("module", "exports", "require", "params", "routeParams", "authInfo", "hub", "fetch", "console", rawCode);
        fn(module, module.exports, global.require, global.params, global.routeParams, global.authInfo, global.hub, global.fetch, global.console);
        return module.exports;
      } catch (err) {
        // 如果不是本地文件，尝试加载已安装的 NPM 包
        try {
          const ref = _hostRequireNpm.applySync(undefined, [id], { result: { reference: true } });
          if (ref) {
            // 为 NPM 包创建代理对象，使其在沙箱内可直接调用
            const createProxy = (r) => {
              if (typeof r !== "object" || r === null) return r;
              return new Proxy(() => {}, {
                apply(target, thisArg, args) {
                  return r.applySync(undefined, args, { result: { copy: true } });
                },
                get(target, prop) {
                  if (prop === "then") return undefined; // 处理 async/await
                  try {
                    const val = r.getSync(prop, { result: { copy: true } });
                    return val;
                  } catch {
                    const nestedRef = r.getSync(prop, { result: { reference: true } });
                    if (typeof nestedRef === "object" && nestedRef !== null) {
                      return createProxy(nestedRef);
                    }
                    return nestedRef;
                  }
                }
              });
            };
            const proxy = createProxy(ref);
            global._requireCache[id] = { exports: proxy };
            return proxy;
          }
        } catch (npmErr) {
          throw new Error("Cannot find module '" + id + "' or NPM package not installed: " + npmErr.message);
        }
        throw err;
      }
    };
  `;
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
