import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";

const execAsync = util.promisify(exec);

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const RSSHUB_DIR = path.join(DATA_DIR, "rsshub");
const RSSHUB_REPO_URL = "https://github.com/DIYgod/RSSHub.git";

/**
 * 确保本地有最新的 RSSHub 代码
 */
export async function ensureRsshubRepo(): Promise<void> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(RSSHUB_DIR) && fs.existsSync(path.join(RSSHUB_DIR, ".git"))) {
    // 已经存在，拉取最新代码
    try {
      await execAsync("git pull", { cwd: RSSHUB_DIR, timeout: 60000 });
    } catch (err) {
      console.warn("更新 RSSHub 代码失败，将使用本地已有代码", err);
    }
  } else {
    // 不存在，克隆代码
    await execAsync(`git clone --depth=1 ${RSSHUB_REPO_URL} ${RSSHUB_DIR}`, { timeout: 120000 });
  }
}

/**
 * 在本地 RSSHub 代码中查找匹配路由的文件内容
 * @param routePath 路由字符串，例如 /bilibili/user/dynamic/:uid
 */
export async function findRsshubRouteFile(routePath: string): Promise<{ filePath: string; content: string } | null> {
  await ensureRsshubRepo();

  const routesDir = path.join(RSSHUB_DIR, "lib", "routes");
  if (!fs.existsSync(routesDir)) {
    return null;
  }

  // 使用 ripgrep 或 grep 查找包含该路由字符串的文件
  // 由于不同的系统可能没有 ripgrep，这里使用原生的 node 遍历，或者简单的 grep。
  // 为了确保通用性，使用 node 递归查找：
  let matchedFile: string | null = null;
  let maxMatchScore = -1;

  function walk(dir: string) {
    if (matchedFile) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && (fullPath.endsWith(".js") || fullPath.endsWith(".ts"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        // 简单匹配路由字符串，例如 '/bilibili/user/dynamic/:uid'
        // 但是可能带有可选参数如 :routeParams?，RSSHub 定义可能是 '/user/dynamic/:uid/:routeParams?'
        // 所以我们需要做一定的模糊匹配。
        
        // 我们提取路径的核心部分，例如 /bilibili/user/dynamic，去掉 /:xxx 参数部分
        const coreRoute = routePath.split('/:')[0];
        
        if (content.includes(routePath)) {
          matchedFile = fullPath;
          break;
        } else if (coreRoute && coreRoute.length > 5 && content.includes(coreRoute)) {
          // 评分：包含越多的参数段得分越高
          let score = 1;
          if (content.includes("router.get")) score++;
          if (score > maxMatchScore) {
            maxMatchScore = score;
            matchedFile = fullPath;
          }
        }
      }
    }
  }

  walk(routesDir);

  if (matchedFile) {
    return {
      filePath: path.relative(RSSHUB_DIR, matchedFile),
      content: fs.readFileSync(matchedFile, "utf-8"),
    };
  }

  return null;
}
