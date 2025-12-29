import path from "path";

/**
 * 安全地解析文件路径，防止目录遍历攻击
 * @param baseDir 基础目录
 * @param filename 文件名
 * @returns 解析后的绝对路径，如果路径非法则抛出错误
 */
export const safeResolvePath = (baseDir: string, filename: string): string => {
  // 解析目标路径
  const resolvedPath = path.resolve(baseDir, filename);

  // 确保基础目录以路径分隔符结尾，以便正确检查前缀
  const safeBaseDir = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;

  // 检查解析后的路径是否在基础目录内
  if (!resolvedPath.startsWith(safeBaseDir)) {
    throw new Error("非法的文件路径访问");
  }

  return resolvedPath;
};
