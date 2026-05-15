import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { SCRIPTS_BASE_DIR } from "./script-runner";

export interface GithubSyncConfig {
  owner: string;
  repo: string;
  branch?: string;
  path?: string; // 子目录路径
  token?: string; // 可选的访问令牌
}

/**
 * 从 GitHub 同步脚本代码
 * 
 * @param folder 目标脚本目录名
 * @param config GitHub 配置
 */
export async function syncFromGithub(folder: string, config: GithubSyncConfig): Promise<void> {
  const { owner, repo, branch = "main", path: subPath, token } = config;
  const targetDir = path.join(SCRIPTS_BASE_DIR, folder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. 下载 tarball
  // GitHub tarball URL: https://api.github.com/repos/:owner/:repo/tarball/:ref
  const url = `https://api.github.com/repos/${owner}/${repo}/tarball/${branch}`;
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "FeedHub-Server",
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub 同步失败 (${response.status}): ${errorText || response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. 临时保存 tarball
  const tempTarPath = path.join(targetDir, `temp_${Date.now()}.tar.gz`);
  fs.writeFileSync(tempTarPath, buffer);

  // 3. 解压
  const tempExtractDir = path.join(targetDir, `temp_extract_${Date.now()}`);
  fs.mkdirSync(tempExtractDir, { recursive: true });

  try {
    // 使用系统 tar 命令解压
    // --strip-components=1 移除 GitHub tarball 自动包的一层目录 (owner-repo-hash/)
    execSync(`tar -xzf "${tempTarPath}" -C "${tempExtractDir}" --strip-components=1`);

    // 4. 处理子目录 (如果有)
    let sourceDir = tempExtractDir;
    if (subPath) {
      sourceDir = path.join(tempExtractDir, subPath);
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`指定的仓库子路径不存在: ${subPath}`);
      }
    }

    // 5. 将文件移动到目标目录 (保留 node_modules 和 .env 等本地文件，除非被覆盖)
    copyRecursiveSync(sourceDir, targetDir);

  } finally {
    // 清理临时文件
    if (fs.existsSync(tempTarPath)) fs.unlinkSync(tempTarPath);
    if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
  }
}

/**
 * 递归复制目录内容
 */
function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // 复制文件，覆盖旧文件
    fs.copyFileSync(src, dest);
  }
}
