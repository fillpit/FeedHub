import fs from "fs";
import path from "path";
import simpleGit, { SimpleGit } from "simple-git";
import { logger } from "../utils/logger";
import { ScriptFileService } from "./ScriptFileService";
import { GitConfig } from "../../../shared/src/types/dynamicRoute";
import { ApiResponseData } from "../utils/apiResponse";

export interface GitUploadOptions {
  gitUrl: string;
  gitBranch: string;
  gitSubPath?: string;
  authType: 'https' | 'ssh' | 'token';
  username?: string;
  password?: string;
  token?: string;
  email?: string;
  commitMessage: string;
}

export class GitUploadService {
  private scriptFileService: ScriptFileService;

  constructor(scriptFileService: ScriptFileService) {
    this.scriptFileService = scriptFileService;
  }

  /**
   * 上传脚本到Git仓库
   */
  async uploadToGit(
    scriptDirName: string,
    options: GitUploadOptions
  ): Promise<ApiResponseData<{ commitHash: string }>> {
    const git = simpleGit();
    const tempDir = path.join(process.cwd(), "temp", `git-upload-${Date.now()}`);
    const scriptDir = this.scriptFileService.getScriptDirectoryPath(scriptDirName);

    try {
      // 检查脚本目录是否存在
      if (!fs.existsSync(scriptDir)) {
        throw new Error(`脚本目录不存在: ${scriptDirName}`);
      }

      // 确保临时目录存在
      if (!fs.existsSync(path.dirname(tempDir))) {
        fs.mkdirSync(path.dirname(tempDir), { recursive: true });
      }

      logger.info(`[GitUploadService] 开始上传到Git仓库: ${options.gitUrl}, 分支: ${options.gitBranch}`);

      // 克隆仓库到临时目录
      await this.cloneRepository(git, options, tempDir);

      // 切换到指定分支
      await this.switchToBranch(git, tempDir, options.gitBranch);

      // 确定目标目录路径
      const targetDir = options.gitSubPath ? path.join(tempDir, options.gitSubPath) : tempDir;

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 复制脚本文件到目标目录
      await this.copyScriptFiles(scriptDir, targetDir);

      // 配置Git用户信息
      await this.configureGitUser(git, tempDir, options);

      // 提交并推送更改
      const commitHash = await this.commitAndPush(git, tempDir, options);

      logger.info(`[GitUploadService] Git上传完成，提交哈希: ${commitHash}`);

      return {
        success: true,
        message: "上传到Git仓库成功",
        data: { commitHash },
      };
    } catch (error) {
      logger.error(`[GitUploadService] Git上传失败:`, error);
      throw new Error(`Git上传失败: ${(error as Error).message}`);
    } finally {
      // 清理临时目录
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          logger.info(`[GitUploadService] 临时目录清理完成: ${tempDir}`);
        } catch (cleanupError) {
          logger.warn(`[GitUploadService] 临时目录清理失败: ${tempDir}`, cleanupError);
        }
      }
    }
  }

  /**
   * 克隆Git仓库
   */
  private async cloneRepository(
    git: SimpleGit,
    options: GitUploadOptions,
    tempDir: string
  ): Promise<void> {
    let cloneUrl = options.gitUrl;

    // 处理不同的认证方式
    if (options.authType === 'https' && options.username && options.password) {
      // HTTPS认证：在URL中嵌入用户名和密码
      const url = new URL(options.gitUrl);
      url.username = encodeURIComponent(options.username);
      url.password = encodeURIComponent(options.password);
      cloneUrl = url.toString();
    } else if (options.authType === 'token' && options.token) {
      // Token认证：使用token作为密码
      const url = new URL(options.gitUrl);
      url.username = options.username || 'token';
      url.password = encodeURIComponent(options.token);
      cloneUrl = url.toString();
    }
    // SSH认证不需要修改URL，依赖系统配置的SSH密钥

    await git.clone(cloneUrl, tempDir, {
      "--depth": "1", // 浅克隆
      "--single-branch": null,
    });
  }

  /**
   * 切换到指定分支
   */
  private async switchToBranch(
    git: SimpleGit,
    tempDir: string,
    branch: string
  ): Promise<void> {
    const gitRepo = git.cwd(tempDir);
    
    try {
      // 尝试切换到现有分支
      await gitRepo.checkout(branch);
    } catch (error) {
      // 如果分支不存在，创建新分支
      logger.info(`[GitUploadService] 分支 ${branch} 不存在，创建新分支`);
      await gitRepo.checkoutLocalBranch(branch);
    }
  }

  /**
   * 复制脚本文件到目标目录
   */
  private async copyScriptFiles(sourceDir: string, targetDir: string): Promise<void> {
    // 如果目标目录已有文件，先清空（排除.git目录）
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      for (const file of files) {
        if (file !== '.git') {
          const filePath = path.join(targetDir, file);
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      }
    }

    // 复制脚本文件
    await this.copyDirectoryContents(sourceDir, targetDir, ['.git']);
  }

  /**
   * 复制目录内容（排除指定文件）
   */
  private async copyDirectoryContents(
    sourceDir: string,
    targetDir: string,
    excludeFiles: string[] = []
  ): Promise<void> {
    const files = fs.readdirSync(sourceDir);

    for (const file of files) {
      if (excludeFiles.includes(file)) {
        continue;
      }

      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
        await this.copyDirectoryContents(sourcePath, targetPath, excludeFiles);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  /**
   * 配置Git用户信息
   */
  private async configureGitUser(
    git: SimpleGit,
    tempDir: string,
    options: GitUploadOptions
  ): Promise<void> {
    const gitRepo = git.cwd(tempDir);
    
    // 设置用户名和邮箱
    const username = options.username || 'FeedHub';
    const email = options.email || 'feedhub@example.com';
    
    await gitRepo.addConfig('user.name', username);
    await gitRepo.addConfig('user.email', email);
  }

  /**
   * 提交并推送更改
   */
  private async commitAndPush(
    git: SimpleGit,
    tempDir: string,
    options: GitUploadOptions
  ): Promise<string> {
    const gitRepo = git.cwd(tempDir);

    // 添加所有文件
    await gitRepo.add('.');

    // 检查是否有更改
    const status = await gitRepo.status();
    if (status.files.length === 0) {
      throw new Error('没有检测到文件更改，无需提交');
    }

    // 提交更改
    const commitResult = await gitRepo.commit(options.commitMessage);
    
    // 推送到远程仓库
    await gitRepo.push('origin', options.gitBranch);

    return commitResult.commit;
  }

  /**
   * 验证Git配置
   */
  async validateGitConfig(options: GitUploadOptions): Promise<ApiResponseData<void>> {
    try {
      // 验证Git URL格式
      if (!this.isValidGitUrl(options.gitUrl)) {
        return {
          success: false,
          message: 'Git仓库地址格式不正确',
          data: undefined,
        };
      }

      // 验证认证信息
      if (options.authType === 'https' && (!options.username || !options.password)) {
        return {
          success: false,
          message: 'HTTPS认证需要提供用户名和密码',
          data: undefined,
        };
      }

      if (options.authType === 'token' && !options.token) {
        return {
          success: false,
          message: 'Token认证需要提供访问令牌',
          data: undefined,
        };
      }

      return {
        success: true,
        message: 'Git配置验证通过',
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: `Git配置验证失败: ${(error as Error).message}`,
        data: undefined,
      };
    }
  }

  /**
   * 验证Git URL格式
   */
  private isValidGitUrl(url: string): boolean {
    try {
      // 支持HTTPS和SSH格式
      const httpsPattern = /^https:\/\/[\w\.-]+\/[\w\.-]+\/[\w\.-]+(\.git)?$/;
      const sshPattern = /^git@[\w\.-]+:[\w\.-]+\/[\w\.-]+(\.git)?$/;
      
      return httpsPattern.test(url) || sshPattern.test(url);
    } catch {
      return false;
    }
  }
}