import { injectable } from "inversify";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";
import AdmZip from "adm-zip";
import { logger } from "../utils/logger";

export interface PackagePreviewData {
  packageInfo: {
    name?: string;
    version?: string;
    description?: string;
    main?: string;
    author?: string;
  };
  fileTree: FileTreeNode[];
  entryContent?: string;
  totalSize: number;
  fileCount: number;
}

export interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: FileTreeNode[];
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  file?: string;
}

export interface PackageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  downloadCount: number;
}

export interface EditSession {
  sessionId: string;
  packagePath: string;
  tempDir: string;
  files: Map<string, string>; // 文件路径 -> 文件内容
  createdAt: Date;
  lastAccessed: Date;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  lastModified: Date;
}

@injectable()
export class ScriptPackageService {
  private editSessions = new Map<string, EditSession>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟超时
  /**
   * 预览脚本包内容
   */
  async previewPackage(filePath: string): Promise<PackagePreviewData> {
    const zipFilePath = path.resolve(process.cwd(), "uploads", filePath);
    
    if (!fs.existsSync(zipFilePath)) {
      throw new Error("脚本包文件不存在");
    }

    const tempDir = path.join(os.tmpdir(), `script-package-preview-${uuidv4()}`);
    
    try {
      // 解压zip文件
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(tempDir, true);
      
      // 读取package.json信息
      const packageInfo = this.readPackageInfo(tempDir);
      
      // 构建文件树
      const fileTree = this.buildFileTree(tempDir);
      
      // 读取入口文件内容
      const entryPoint = packageInfo.main || "index.js";
      const entryContent = this.readEntryContent(tempDir, entryPoint);
      
      // 计算总大小和文件数量
      const stats = this.calculateStats(tempDir);
      
      return {
        packageInfo,
        fileTree,
        entryContent,
        totalSize: stats.totalSize,
        fileCount: stats.fileCount
      };
    } finally {
      // 清理临时目录
      this.cleanupTempDir(tempDir);
    }
  }

  /**
   * 验证脚本包结构
   */
  async validatePackage(filePath: string): Promise<ValidationResult> {
    const zipFilePath = path.resolve(process.cwd(), "uploads", filePath);
    
    if (!fs.existsSync(zipFilePath)) {
      throw new Error("脚本包文件不存在");
    }

    const tempDir = path.join(os.tmpdir(), `script-package-validate-${uuidv4()}`);
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    
    try {
      // 解压zip文件
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(tempDir, true);
      
      // 验证基本结构
      this.validateBasicStructure(tempDir, issues, suggestions);
      
      // 验证package.json
      this.validatePackageJson(tempDir, issues, suggestions);
      
      // 验证入口文件
      this.validateEntryFile(tempDir, issues, suggestions);
      
      // 验证文件大小和数量
      this.validateFileConstraints(tempDir, issues, suggestions);
      
      const hasErrors = issues.some(issue => issue.level === 'error');
      
      return {
        valid: !hasErrors,
        message: hasErrors ? '脚本包结构存在错误' : '脚本包结构验证通过',
        issues,
        suggestions
      };
    } finally {
      // 清理临时目录
      this.cleanupTempDir(tempDir);
    }
  }

  /**
   * 获取脚本包模板列表
   */
  async getTemplates(): Promise<PackageTemplate[]> {
    const templatesDir = path.join(__dirname, '../templates');
    const templates: PackageTemplate[] = [];

    try {
      if (!fs.existsSync(templatesDir)) {
        return templates;
      }

      const templateDirs = fs.readdirSync(templatesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const templateDir of templateDirs) {
        const templatePath = path.join(templatesDir, templateDir);
        const packageJsonPath = path.join(templatePath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            
            templates.push({
              id: templateDir,
              name: packageJson.name || templateDir,
              description: packageJson.description || '',
              version: packageJson.version || '1.0.0',
              author: packageJson.author || '',
              category: packageJson.feedhub?.category || '通用',
              tags: packageJson.feedhub?.tags || [],
              downloadCount: 0
            });
          } catch (error) {
            logger.warn(`解析模板 ${templateDir} 的 package.json 失败:`, error);
          }
        }
      }

      return templates;
    } catch (error) {
      logger.error('获取模板列表失败:', error);
      return templates;
    }
  }

  /**
   * 下载脚本包模板
   */
  async downloadTemplate(templateId: string): Promise<{ filename: string; buffer: Buffer }> {
    const templatesDir = path.join(__dirname, '../templates');
    const templatePath = path.join(templatesDir, templateId);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`模板 ${templateId} 不存在`);
    }

    // 创建临时zip文件
    const zip = new AdmZip();
    
    // 递归添加模板目录中的所有文件
    const addDirectoryToZip = (dirPath: string, zipPath: string = '') => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const itemZipPath = zipPath ? `${zipPath}/${item.name}` : item.name;
        
        if (item.isDirectory()) {
          addDirectoryToZip(itemPath, itemZipPath);
        } else {
          const content = fs.readFileSync(itemPath);
          zip.addFile(itemZipPath, content);
        }
      }
    };

    addDirectoryToZip(templatePath);
    
    const buffer = zip.toBuffer();
    const filename = `${templateId}-template.zip`;
    
    return { filename, buffer };
  }

  /**
   * 创建编辑会话
   */
  async createEditSession(filePath: string): Promise<string> {
    const zipFilePath = path.resolve(process.cwd(), "uploads", filePath);
    
    if (!fs.existsSync(zipFilePath)) {
      throw new Error("脚本包文件不存在");
    }

    const sessionId = uuidv4();
    const tempDir = path.join(os.tmpdir(), `script-package-edit-${sessionId}`);
    
    try {
      // 解压zip文件
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(tempDir, true);
      
      // 读取所有文件内容
      const files = new Map<string, string>();
      this.loadAllFiles(tempDir, files);
      
      // 创建编辑会话
      const session: EditSession = {
        sessionId,
        packagePath: filePath,
        tempDir,
        files,
        createdAt: new Date(),
        lastAccessed: new Date()
      };
      
      this.editSessions.set(sessionId, session);
      
      // 清理过期会话
      this.cleanupExpiredSessions();
      
      logger.info(`创建编辑会话: ${sessionId}`);
      return sessionId;
    } catch (error) {
      // 如果创建失败，清理临时目录
      this.cleanupTempDir(tempDir);
      throw error;
    }
  }

  /**
   * 获取编辑会话的文件列表
   */
  async getEditSessionFiles(sessionId: string): Promise<FileTreeNode[]> {
    const session = this.getSession(sessionId);
    return this.buildFileTree(session.tempDir);
  }

  /**
   * 读取编辑会话中的文件内容
   */
  async getEditSessionFileContent(sessionId: string, filePath: string): Promise<FileContent> {
    const session = this.getSession(sessionId);
    
    // 规范化文件路径
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const fullPath = path.join(session.tempDir, normalizedPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      throw new Error(`路径是目录，不是文件: ${filePath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    return {
      path: filePath,
      content,
      size: stats.size,
      lastModified: stats.mtime
    };
  }

  /**
   * 保存编辑会话中的文件内容
   */
  async saveEditSessionFileContent(sessionId: string, filePath: string, content: string): Promise<void> {
    const session = this.getSession(sessionId);
    
    // 规范化文件路径
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const fullPath = path.join(session.tempDir, normalizedPath);
    
    // 确保目录存在
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 保存文件内容
    fs.writeFileSync(fullPath, content, 'utf-8');
    
    // 更新会话中的文件内容缓存
    session.files.set(normalizedPath, content);
    session.lastAccessed = new Date();
    
    logger.info(`保存文件: ${sessionId}/${filePath}`);
  }

  /**
   * 获取编辑会话的临时目录路径（用于调试）
   */
  getEditSessionTempDir(sessionId: string): string {
    const session = this.getSession(sessionId);
    return session.tempDir;
  }

  /**
   * 关闭编辑会话
   */
  async closeEditSession(sessionId: string): Promise<void> {
    const session = this.editSessions.get(sessionId);
    if (session) {
      this.cleanupTempDir(session.tempDir);
      this.editSessions.delete(sessionId);
      logger.info(`关闭编辑会话: ${sessionId}`);
    }
  }

  /**
   * 导出编辑会话为新的脚本包
   */
  async exportEditSession(sessionId: string): Promise<{ filename: string; buffer: Buffer }> {
    const session = this.getSession(sessionId);
    
    // 创建新的zip文件
    const zip = new AdmZip();
    
    // 递归添加临时目录中的所有文件
    const addDirectoryToZip = (dirPath: string, zipPath: string = '') => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const itemZipPath = zipPath ? `${zipPath}/${item.name}` : item.name;
        
        if (item.isDirectory()) {
          addDirectoryToZip(itemPath, itemZipPath);
        } else {
          const content = fs.readFileSync(itemPath);
          zip.addFile(itemZipPath, content);
        }
      }
    };

    addDirectoryToZip(session.tempDir);
    
    const buffer = zip.toBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `edited-script-package-${timestamp}.zip`;
    
    return { filename, buffer };
  }

  /**
   * 读取package.json信息
   */
  private readPackageInfo(tempDir: string): any {
    const packageJsonPath = path.join(tempDir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        logger.warn('解析package.json失败:', error);
      }
    }
    
    return {};
  }

  /**
   * 构建文件树
   */
  private buildFileTree(dirPath: string, basePath: string = ''): FileTreeNode[] {
    const items: FileTreeNode[] = [];
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const relativePath = path.join(basePath, entry);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        items.push({
          name: entry,
          type: 'folder',
          path: relativePath,
          children: this.buildFileTree(fullPath, relativePath)
        });
      } else {
        items.push({
          name: entry,
          type: 'file',
          size: stats.size,
          path: relativePath
        });
      }
    }
    
    return items.sort((a, b) => {
      // 文件夹排在前面
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * 读取入口文件内容
   */
  private readEntryContent(tempDir: string, entryPoint: string): string | undefined {
    const entryPath = path.join(tempDir, entryPoint);
    
    if (fs.existsSync(entryPath)) {
      try {
        return fs.readFileSync(entryPath, 'utf-8');
      } catch (error) {
        logger.warn('读取入口文件失败:', error);
      }
    }
    
    return undefined;
  }

  /**
   * 计算统计信息
   */
  private calculateStats(dirPath: string): { totalSize: number; fileCount: number } {
    let totalSize = 0;
    let fileCount = 0;
    
    const calculateRecursive = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath);
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          calculateRecursive(fullPath);
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    };
    
    calculateRecursive(dirPath);
    return { totalSize, fileCount };
  }

  /**
   * 验证基本结构
   */
  private validateBasicStructure(tempDir: string, issues: ValidationIssue[], suggestions: string[]): void {
    const entries = fs.readdirSync(tempDir);
    
    if (entries.length === 0) {
      issues.push({
        level: 'error',
        message: '脚本包为空'
      });
      return;
    }
    
    // 检查是否有JavaScript文件
    const hasJsFiles = entries.some(entry => {
      const fullPath = path.join(tempDir, entry);
      return fs.statSync(fullPath).isFile() && entry.endsWith('.js');
    });
    
    if (!hasJsFiles) {
      issues.push({
        level: 'error',
        message: '脚本包中没有找到JavaScript文件'
      });
    }
  }

  /**
   * 验证package.json
   */
  private validatePackageJson(tempDir: string, issues: ValidationIssue[], suggestions: string[]): void {
    const packageJsonPath = path.join(tempDir, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      issues.push({
        level: 'error',
        message: '脚本包必须包含package.json文件',
        file: 'package.json'
      });
      return;
    }
    
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageInfo = JSON.parse(content);
      
      if (!packageInfo.main) {
        issues.push({
          level: 'error',
          message: 'package.json中必须包含main字段指定入口文件',
          file: 'package.json'
        });
      }
      
      if (!packageInfo.name) {
        suggestions.push('建议在package.json中添加name字段');
      }
      
      if (!packageInfo.version) {
        suggestions.push('建议在package.json中添加version字段');
      }
      
      if (!packageInfo.description) {
        suggestions.push('建议在package.json中添加description字段');
      }
    } catch (error) {
      issues.push({
        level: 'error',
        message: 'package.json格式错误',
        file: 'package.json'
      });
    }
  }

  /**
   * 验证入口文件
   */
  private validateEntryFile(tempDir: string, issues: ValidationIssue[], suggestions: string[]): void {
    const packageInfo = this.readPackageInfo(tempDir);
    const entryPoint = packageInfo.main || 'index.js';
    const entryPath = path.join(tempDir, entryPoint);
    
    if (!fs.existsSync(entryPath)) {
      issues.push({
        level: 'error',
        message: `入口文件不存在: ${entryPoint}`,
        file: entryPoint
      });
      return;
    }
    
    try {
      const content = fs.readFileSync(entryPath, 'utf-8');
      
      // 检查是否包含基本的脚本结构
      if (!content.includes('routeParams')) {
        suggestions.push('建议在入口文件中使用routeParams获取路由参数');
      }
      
      if (!content.includes('return')) {
        issues.push({
          level: 'warning',
          message: '入口文件中没有找到return语句',
          file: entryPoint
        });
      }
    } catch (error) {
      issues.push({
        level: 'error',
        message: `无法读取入口文件: ${entryPoint}`,
        file: entryPoint
      });
    }
  }

  /**
   * 验证文件约束
   */
  private validateFileConstraints(tempDir: string, issues: ValidationIssue[], suggestions: string[]): void {
    const stats = this.calculateStats(tempDir);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 100;
    
    if (stats.totalSize > maxSize) {
      issues.push({
        level: 'error',
        message: `脚本包大小超过限制 (${(stats.totalSize / 1024 / 1024).toFixed(2)}MB > 10MB)`
      });
    }
    
    if (stats.fileCount > maxFiles) {
      issues.push({
        level: 'warning',
        message: `文件数量较多 (${stats.fileCount} > ${maxFiles})，可能影响性能`
      });
    }
    
    if (stats.totalSize > 5 * 1024 * 1024) { // 5MB
      suggestions.push('脚本包较大，建议优化文件大小以提高加载性能');
    }
  }



  /**
   * 清理临时目录
   */
  private cleanupTempDir(tempDir: string): void {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.warn(`清理临时目录失败: ${tempDir}`, error);
    }
  }

  /**
   * 获取编辑会话
   */
  private getSession(sessionId: string): EditSession {
    const session = this.editSessions.get(sessionId);
    if (!session) {
      throw new Error(`编辑会话不存在: ${sessionId}`);
    }
    
    // 检查会话是否过期
    const now = new Date();
    if (now.getTime() - session.lastAccessed.getTime() > this.SESSION_TIMEOUT) {
      this.editSessions.delete(sessionId);
      this.cleanupTempDir(session.tempDir);
      throw new Error(`编辑会话已过期: ${sessionId}`);
    }
    
    // 更新最后访问时间
    session.lastAccessed = now;
    return session;
  }

  /**
   * 递归加载所有文件内容
   */
  private loadAllFiles(dirPath: string, files: Map<string, string>, basePath: string = ''): void {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
      
      if (item.isDirectory()) {
        this.loadAllFiles(itemPath, files, relativePath);
      } else {
        try {
          const content = fs.readFileSync(itemPath, 'utf-8');
          files.set(relativePath, content);
        } catch (error) {
          // 忽略无法读取的文件（如二进制文件）
          logger.warn(`无法读取文件: ${relativePath}`, error);
        }
      }
    }
  }

  /**
   * 清理过期的编辑会话
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.editSessions.entries()) {
      if (now.getTime() - session.lastAccessed.getTime() > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      const session = this.editSessions.get(sessionId);
      if (session) {
        this.cleanupTempDir(session.tempDir);
        this.editSessions.delete(sessionId);
        logger.info(`清理过期编辑会话: ${sessionId}`);
      }
    }
  }
}