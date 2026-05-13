import fs from "node:fs";
import path from "node:path";
import { SCRIPTS_BASE_DIR, ensureScriptsDir } from "./script-runner";

/** 列出脚本目录的所有文件 */
export function listScriptFiles(folder: string): Array<{
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
}> {
  const dir = path.join(SCRIPTS_BASE_DIR, folder);
  if (!fs.existsSync(dir)) return [];
  return walkDir(dir, dir);
}

function walkDir(dirPath: string, baseDir: string): Array<{
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
}> {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: ReturnType<typeof walkDir> = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: relativePath, type: "directory" });
      results.push(...walkDir(fullPath, baseDir));
    } else {
      const stats = fs.statSync(fullPath);
      results.push({ name: entry.name, path: relativePath, type: "file", size: stats.size });
    }
  }

  return results;
}

/** 读取文件内容 */
export function readScriptFile(folder: string, filePath: string): string {
  const fullPath = resolveScriptPath(folder, filePath);
  if (!fs.existsSync(fullPath)) throw new Error(`文件不存在: ${filePath}`);
  return fs.readFileSync(fullPath, "utf-8");
}

/** 写入文件内容 */
export function writeScriptFile(folder: string, filePath: string, content: string): void {
  const fullPath = resolveScriptPath(folder, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

/** 删除文件 */
export function deleteScriptFile(folder: string, filePath: string): void {
  const fullPath = resolveScriptPath(folder, filePath);
  if (!fs.existsSync(fullPath)) throw new Error(`文件不存在: ${filePath}`);
  fs.unlinkSync(fullPath);
}

/** 创建脚本目录并返回目录名 */
export function createScriptDirectory(routeName: string): string {
  ensureScriptsDir();
  const sanitized = routeName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  const timestamp = Date.now();
  const folderName = `${sanitized}_${timestamp}`;
  const fullPath = path.join(SCRIPTS_BASE_DIR, folderName);
  fs.mkdirSync(fullPath, { recursive: true });
  writeScriptFile(folderName, "main.js", DEFAULT_MAIN_JS);
  return folderName;
}

/** 删除整个脚本目录 */
export function deleteScriptDirectory(folder: string): void {
  const dir = path.join(SCRIPTS_BASE_DIR, folder);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** 检查 README 是否存在并读取 */
export function readReadme(folder: string): string | null {
  const dir = path.join(SCRIPTS_BASE_DIR, folder);
  for (const name of ["README.md", "readme.md", "README.txt"]) {
    const filePath = path.join(dir, name);
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf-8");
  }
  return null;
}

/** 防路径遍历：解析后必须在 scriptDir 内 */
function resolveScriptPath(folder: string, filePath: string): string {
  const scriptDir = path.join(SCRIPTS_BASE_DIR, folder);
  const resolved = path.resolve(scriptDir, filePath);
  if (!resolved.startsWith(scriptDir)) throw new Error("非法路径");
  return resolved;
}

const DEFAULT_MAIN_JS = `/**
 * FeedHub 脚本入口
 * 
 * 可用全局变量：
 *   params       - 查询参数 { [paramName]: value }
 *   routeParams  - 路径参数 { [paramName]: value }
 *   authInfo     - 授权信息 { cookie/token/username... }
 *   fetch        - 内置 fetch
 *   console      - console.log/warn/error
 *
 * 返回 FeedItem 数组：
 * [{ title, link, content?, author?, pubDate?, guid? }]
 */
return [
  {
    title: "示例条目",
    link: "https://example.com",
    content: "这是一个示例内容",
    pubDate: new Date().toISOString(),
  },
];
`;
