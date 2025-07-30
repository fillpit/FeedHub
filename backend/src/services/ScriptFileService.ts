import { injectable } from "inversify";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

/**
 * 脚本文件管理服务
 * 负责管理动态路由脚本的文件系统存储
 */
@injectable()
export class ScriptFileService {
  private readonly scriptsDir: string;

  constructor() {
    // 如果当前工作目录已经是 backend 目录，直接使用 scripts
    // 否则使用 backend/scripts
    const cwd = process.cwd();
    if (cwd.endsWith('/backend') || cwd.endsWith('\\backend')) {
      this.scriptsDir = path.join(cwd, "scripts");
    } else {
      this.scriptsDir = path.join(cwd, "backend", "scripts");
    }
    this.ensureScriptsDirectory();
  }

  /**
   * 确保脚本目录存在
   */
  private ensureScriptsDirectory(): void {
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
      logger.info(`[ScriptFileService] 创建脚本目录: ${this.scriptsDir}`);
    }
  }

  /**
   * 为新的动态路由创建脚本目录
   * @param routeName 路由名称
   * @returns 脚本目录路径
   */
  async createRouteScriptDirectory(routeName: string): Promise<string> {
    // 生成唯一的目录名（路由名称 + UUID前8位）
    const dirName = `${this.sanitizeFileName(routeName)}_${uuidv4().substring(0, 8)}`;
    const scriptDir = path.join(this.scriptsDir, dirName);

    // 创建目录
    fs.mkdirSync(scriptDir, { recursive: true });
    
    
    logger.info(`[ScriptFileService] 为路由 "${routeName}" 创建脚本目录: ${scriptDir}`);
    return dirName; // 返回相对路径
  }

  /**
   * 创建默认的脚本文件
   */
  private async createDefaultScriptFiles(scriptDir: string): Promise<void> {
    // 创建主脚本文件 main.js
    const mainScriptContent = `/**
 * 动态路由脚本
 * 这是您的自定义脚本入口文件
 */

/**
 * 主函数 - 脚本的入口点
 * @param {Object} context - 脚本执行上下文
 * @returns {Object|Array} RSS格式的数据或文章数组
 */
async function main(context) {
  const { routeParams, utils, auth, console, dayjs, helpers, customRequire } = context;
  
  try {
    // 在这里编写您的脚本逻辑
    console.log('脚本开始执行，路由参数:', routeParams);
    
    // 示例：返回简单的文章列表
    const items = [
      {
        title: '示例文章1',
        link: 'https://example.com/article1',
        content: '这是示例文章的内容',
        author: '作者',
        pubDate: dayjs().toISOString(),
      },
      {
        title: '示例文章2', 
        link: 'https://example.com/article2',
        content: '这是另一篇示例文章的内容',
        author: '作者',
        pubDate: dayjs().subtract(1, 'day').toISOString(),
      }
    ];
    
    // 返回完整的RSS格式数据（推荐）
    return {
      title: '我的动态路由RSS',
      description: '这是一个动态生成的RSS源',
      link: 'https://example.com',
      items: items
    };
    
  } catch (error) {
    console.error('脚本执行失败:', error);
    throw error;
  }
}

// 导出主函数
module.exports = { main };
`;

    const mainScriptPath = path.join(scriptDir, 'main.js');
    fs.writeFileSync(mainScriptPath, mainScriptContent, 'utf-8');

    // 创建 package.json
    const packageJson = {
      name: 'dynamic-route-script',
      version: '1.0.0',
      description: '动态路由脚本',
      main: 'main.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: ['feedhub', 'dynamic-route', 'rss'],
      author: '',
      license: 'ISC'
    };

    const packageJsonPath = path.join(scriptDir, 'package.json');
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

    // 创建 utils 目录和示例工具文件
    const utilsDir = path.join(scriptDir, 'utils');
    fs.mkdirSync(utilsDir, { recursive: true });

    const helperContent = `/**
 * 工具函数
 */

/**
 * 格式化日期
 * @param {Date|string} date 日期
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  return new Date(date).toISOString();
}

/**
 * 清理HTML标签
 * @param {string} html HTML字符串
 * @returns {string} 清理后的文本
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * 截取文本
 * @param {string} text 文本
 * @param {number} length 长度
 * @returns {string} 截取后的文本
 */
function truncateText(text, length = 100) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

module.exports = {
  formatDate,
  stripHtml,
  truncateText
};
`;

    const helperPath = path.join(utilsDir, 'helper.js');
    fs.writeFileSync(helperPath, helperContent, 'utf-8');

    logger.info(`[ScriptFileService] 创建默认脚本文件完成: ${scriptDir}`);
  }

  /**
   * 获取脚本目录的完整路径
   * @param scriptDirName 脚本目录名称
   * @returns 完整路径
   */
  getScriptDirectoryPath(scriptDirName: string): string {
    return path.join(this.scriptsDir, scriptDirName);
  }

  /**
   * 检查脚本目录是否存在
   * @param scriptDirName 脚本目录名称
   * @returns 是否存在
   */
  scriptDirectoryExists(scriptDirName: string): boolean {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    return fs.existsSync(scriptDir);
  }

  /**
   * 读取脚本文件内容
   * @param scriptDirName 脚本目录名称
   * @param fileName 文件名（默认为main.js）
   * @returns 文件内容
   */
  async readScriptFile(scriptDirName: string, fileName: string = 'main.js'): Promise<string> {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    const filePath = path.join(scriptDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`脚本文件不存在: ${fileName}`);
    }
    
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 写入脚本文件内容
   * @param scriptDirName 脚本目录名称
   * @param fileName 文件名
   * @param content 文件内容
   */
  async writeScriptFile(scriptDirName: string, fileName: string, content: string): Promise<void> {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    
    if (!fs.existsSync(scriptDir)) {
      throw new Error(`脚本目录不存在: ${scriptDirName}`);
    }
    
    const filePath = path.join(scriptDir, fileName);
    
    // 确保文件所在的目录存在
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
      logger.info(`[ScriptFileService] 创建目录: ${fileDir}`);
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    
    logger.info(`[ScriptFileService] 更新脚本文件: ${filePath}`);
  }

  /**
   * 获取脚本目录中的所有文件
   * @param scriptDirName 脚本目录名称
   * @returns 文件列表
   */
  async getScriptFiles(scriptDirName: string): Promise<string[]> {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    
    if (!fs.existsSync(scriptDir)) {
      throw new Error(`脚本目录不存在: ${scriptDirName}`);
    }
    
    return this.getFilesRecursively(scriptDir, scriptDir);
  }

  /**
   * 递归获取目录中的所有文件
   */
  private getFilesRecursively(dir: string, baseDir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath, baseDir));
      } else {
        const relativePath = path.relative(baseDir, fullPath);
        files.push(relativePath);
      }
    }
    
    return files;
  }

  /**
   * 删除脚本目录
   * @param scriptDirName 脚本目录名称
   */
  async deleteScriptDirectory(scriptDirName: string): Promise<void> {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    
    if (fs.existsSync(scriptDir)) {
      fs.rmSync(scriptDir, { recursive: true, force: true });
      logger.info(`[ScriptFileService] 删除脚本目录: ${scriptDir}`);
    }
  }

  /**
   * 删除脚本文件
   * @param scriptDirName 脚本目录名称
   * @param fileName 文件名
   */
  async deleteScriptFile(scriptDirName: string, fileName: string): Promise<void> {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    
    if (!fs.existsSync(scriptDir)) {
      throw new Error(`脚本目录不存在: ${scriptDirName}`);
    }
    
    const filePath = path.join(scriptDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${fileName}`);
    }
    
    try {
      fs.unlinkSync(filePath);
      logger.info(`[ScriptFileService] 删除脚本文件: ${filePath}`);
    } catch (error) {
      logger.error(`[ScriptFileService] 删除脚本文件失败: ${filePath}`, error);
      throw new Error(`删除脚本文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 复制脚本目录
   * @param sourceScriptDirName 源脚本目录名称
   * @param targetRouteName 目标路由名称
   * @returns 新的脚本目录名称
   */
  async copyScriptDirectory(sourceScriptDirName: string, targetRouteName: string): Promise<string> {
    const sourceDir = this.getScriptDirectoryPath(sourceScriptDirName);
    
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`源脚本目录不存在: ${sourceScriptDirName}`);
    }
    
    // 创建新的目录名
    const newDirName = `${this.sanitizeFileName(targetRouteName)}_${uuidv4().substring(0, 8)}`;
    const targetDir = path.join(this.scriptsDir, newDirName);
    
    // 复制目录
    this.copyDirectoryRecursively(sourceDir, targetDir);
    
    logger.info(`[ScriptFileService] 复制脚本目录: ${sourceDir} -> ${targetDir}`);
    return newDirName;
  }

  /**
   * 递归复制目录
   */
  private copyDirectoryRecursively(source: string, target: string): void {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    
    const items = fs.readdirSync(source);
    
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        this.copyDirectoryRecursively(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  /**
   * 清理文件名，移除不安全字符
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  /**
   * 获取脚本目录的统计信息
   * @param scriptDirName 脚本目录名称
   * @returns 统计信息
   */
  async getScriptDirectoryStats(scriptDirName: string): Promise<{
    fileCount: number;
    totalSize: number;
    lastModified: Date;
  }> {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    
    if (!fs.existsSync(scriptDir)) {
      throw new Error(`脚本目录不存在: ${scriptDirName}`);
    }
    
    let fileCount = 0;
    let totalSize = 0;
    let lastModified = new Date(0);
    
    const calculateStats = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          calculateStats(fullPath);
        } else {
          fileCount++;
          totalSize += stat.size;
          if (stat.mtime > lastModified) {
            lastModified = stat.mtime;
          }
        }
      }
    };
    
    calculateStats(scriptDir);
    
    return {
      fileCount,
      totalSize,
      lastModified,
    };
  }

  /**
   * 确保指定的目录路径存在，如果不存在则创建（支持多级目录）
   */
  async ensureDirectoryExists(scriptDirName: string, relativePath: string): Promise<void> {
    const scriptDir = this.getScriptDirectoryPath(scriptDirName);
    const targetDir = path.join(scriptDir, relativePath);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      logger.info(`创建目录: ${targetDir}`);
    }
  }
}