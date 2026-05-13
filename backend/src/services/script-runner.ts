import { FeedOutput, ScriptContext, ScriptResult, FeedItem } from "../types/feed";
import vm from "node:vm";
import path from "node:path";
import fs from "node:fs";

const SCRIPTS_BASE_DIR = process.env.SCRIPTS_DIR
  || path.join(process.env.ELECTRON_USER_DATA || process.cwd(), "data", "scripts");

/**
 * 执行用户脚本，返回 feed 条目列表
 * 使用 Node 内置 vm 模块进行沙箱隔离（低安全性，后续可替换为 isolated-vm）
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

  const scriptDir = path.join(SCRIPTS_BASE_DIR, scriptFolder);
  const mainFile = resolveMainFile(scriptDir);

  if (!mainFile) {
    return { success: false, error: "脚本入口文件不存在", logs, executionTime: 0 };
  }

  const code = fs.readFileSync(mainFile, "utf-8");
  const sandbox = buildSandbox(context, logs, scriptDir);

  try {
    const result = await executeWithTimeout(code, sandbox, timeoutMs);
    const items = normalizeItems(result);
    return {
      success: true,
      data: { title: "FeedHub", items },
      logs,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message, logs, executionTime: Date.now() - startTime };
  }
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

function buildSandbox(
  context: ScriptContext,
  logs: Array<{ level: string; message: string }>,
  scriptDir: string,
): Record<string, unknown> {
  const makeLogger = (level: string) =>
    (...args: unknown[]) => logs.push({ level, message: args.map(String).join(" ") });

  return {
    console: { log: makeLogger("info"), warn: makeLogger("warn"), error: makeLogger("error") },
    params: context.params,
    routeParams: context.routeParams,
    authInfo: context.authInfo,
    require: buildSafeRequire(scriptDir),
    setTimeout,
    clearTimeout,
    Promise,
    fetch: globalThis.fetch,
    JSON,
    Buffer,
    URL,
    URLSearchParams,
    process: { env: {} },
  };
}

function buildSafeRequire(scriptDir: string) {
  const ALLOWED_BUILTIN = new Set(["path", "url", "querystring", "crypto", "util"]);
  return (id: string) => {
    if (ALLOWED_BUILTIN.has(id)) return require(id);
    const local = path.resolve(scriptDir, id);
    if (local.startsWith(scriptDir) && fs.existsSync(local)) return require(local);
    throw new Error(`不允许 require("${id}")`);
  };
}

async function executeWithTimeout(
  code: string,
  sandbox: Record<string, unknown>,
  timeoutMs: number,
): Promise<unknown> {
  const ctx = vm.createContext(sandbox);
  const script = new vm.Script(code, { filename: "main.js" });
  const result = script.runInContext(ctx, { timeout: timeoutMs });
  return await Promise.resolve(result);
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

/** 确保脚本目录存在 */
export function ensureScriptsDir(): void {
  if (!fs.existsSync(SCRIPTS_BASE_DIR)) {
    fs.mkdirSync(SCRIPTS_BASE_DIR, { recursive: true });
  }
}

export { SCRIPTS_BASE_DIR };
