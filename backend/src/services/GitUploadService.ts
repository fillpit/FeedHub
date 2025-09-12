import fs from "fs";
import path from "path";
import simpleGit, { SimpleGit } from "simple-git";
import { logger } from "../utils/logger";
import { ScriptFileService } from "./ScriptFileService";
import { ApiResponseData } from "../utils/apiResponse";
import { GitConfig } from "@feedhub/shared";

export class GitUploadService {
  private scriptFileService: ScriptFileService;

  constructor(scriptFileService: ScriptFileService) {
    this.scriptFileService = scriptFileService;
  }

  /**
   * 获取Git上传临时目录的基础路径
   * 优先从环境变量 GIT_UPLOAD_TEMP_DIR 读取，没有则使用项目根目录下的temp目录
   */
  private getGitUploadTempBasePath(): string {
    const envTempDir = process.env.GIT_UPLOAD_TEMP_DIR;
    if (envTempDir) {
      logger.info(`[GitUploadService] 使用环境变量指定的临时目录: ${envTempDir}`);
      return envTempDir;
    }

    // 如果环境变量未设置，默认使用项目根目录下的custom_packages目录
    const cwd = process.cwd();
    let defaultTempDir = path.join(cwd, "temp");
    if (cwd.endsWith("/backend") || cwd.endsWith("\\backend")) {
      // 如果当前在backend目录，则使用上级目录的custom_packages
      defaultTempDir = path.join(path.dirname(cwd), "temp");
    }
    
    logger.info(`[GitUploadService] 使用默认临时目录: ${defaultTempDir}`);
    return defaultTempDir;
  }

  /**
   * 上传脚本到Git仓库
   */
  async uploadToGit(
    scriptDirName: string,
    options: GitConfig
  ): Promise<ApiResponseData<{ commitHash: string }>> {
    const git = simpleGit();
    const tempBasePath = this.getGitUploadTempBasePath();
    const tempDir = path.join(tempBasePath, `git-upload-${Date.now()}`);
    const scriptDir = this.scriptFileService.getScriptDirectoryPath(scriptDirName);

    // 记录详细的开始信息
    logger.info(`[GitUploadService] ========== Git上传开始 ==========`);
    logger.info(`[GitUploadService] 脚本目录名: ${scriptDirName}`);
    logger.info(`[GitUploadService] 脚本目录路径: ${scriptDir}`);
    logger.info(`[GitUploadService] 临时目录: ${tempDir}`);
    logger.info(`[GitUploadService] Git配置:`, {
      gitUrl: options.gitUrl,
      gitBranch: options.gitBranch,
      gitSubPath: options.gitSubPath || '(根目录)',
      authType: options.authType,
      email: options.email || '(未设置)',
      commitMessage: options.defaultCommitMessage || '(未设置)',
    });

    try {
      // 检查脚本目录是否存在
      logger.info(`[GitUploadService] 步骤1: 检查脚本目录是否存在`);
      if (!fs.existsSync(scriptDir)) {
        logger.error(`[GitUploadService] 脚本目录不存在: ${scriptDir}`);
        throw new Error(`脚本目录不存在: ${scriptDirName}`);
      }
      logger.info(`[GitUploadService] 脚本目录存在，继续执行`);

      // 确保临时目录存在
      logger.info(`[GitUploadService] 步骤2: 创建临时目录`);
      if (!fs.existsSync(path.dirname(tempDir))) {
        fs.mkdirSync(path.dirname(tempDir), { recursive: true });
        logger.info(`[GitUploadService] 临时目录父目录已创建: ${path.dirname(tempDir)}`);
      }

      logger.info(`[GitUploadService] 开始上传到Git仓库: ${options.gitUrl}, 分支: ${options.gitBranch}`);

      // 克隆仓库到临时目录
      logger.info(`[GitUploadService] 步骤3: 克隆Git仓库`);
      await this.cloneRepository(git, options, tempDir);
      logger.info(`[GitUploadService] Git仓库克隆完成`);

      // 切换到指定分支
      logger.info(`[GitUploadService] 步骤4: 切换到分支 ${options.gitBranch}`);
      await this.switchToBranch(git, tempDir, options.gitBranch);
      logger.info(`[GitUploadService] 分支切换完成`);

      // 确定目标目录路径
      const targetDir = options.gitSubPath ? path.join(tempDir, options.gitSubPath) : tempDir;
      logger.info(`[GitUploadService] 步骤5: 准备目标目录`);
      logger.info(`[GitUploadService] 目标目录路径: ${targetDir}`);

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        logger.info(`[GitUploadService] 目标目录不存在，正在创建`);
        fs.mkdirSync(targetDir, { recursive: true });
        logger.info(`[GitUploadService] 目标目录创建完成`);
      } else {
        logger.info(`[GitUploadService] 目标目录已存在`);
      }

      // 复制脚本文件到目标目录
      logger.info(`[GitUploadService] 步骤6: 复制脚本文件`);
      await this.copyScriptFiles(scriptDir, targetDir);
      logger.info(`[GitUploadService] 脚本文件复制完成`);

      // 配置Git用户信息
      logger.info(`[GitUploadService] 步骤7: 配置Git用户信息`);
      await this.configureGitUser(git, tempDir, options);
      logger.info(`[GitUploadService] Git用户信息配置完成`);

      // 提交并推送更改
      logger.info(`[GitUploadService] 步骤8: 提交并推送更改`);
      const commitHash = await this.commitAndPush(git, tempDir, options);
      logger.info(`[GitUploadService] 提交推送完成`);

      logger.info(`[GitUploadService] ========== Git上传成功完成 ==========`);
      logger.info(`[GitUploadService] 提交哈希: ${commitHash}`);

      return {
        success: true,
        message: "上传到Git仓库成功",
        data: { commitHash },
      };
    } catch (error) {
      logger.error(`[GitUploadService] ========== Git上传失败 ==========`);
      logger.error(`[GitUploadService] 错误类型: ${error?.constructor?.name || 'Unknown'}`);
      logger.error(`[GitUploadService] 错误消息: ${(error as Error).message}`);
      logger.error(`[GitUploadService] 错误堆栈:`, (error as Error).stack);
      logger.error(`[GitUploadService] 失败时的配置:`, {
        scriptDirName,
        gitUrl: options.gitUrl,
        gitBranch: options.gitBranch,
        authType: options.authType,
        tempDir
      });
      throw new Error(`Git上传失败: ${(error as Error).message}`);
    } finally {
      // 清理临时目录
      logger.info(`[GitUploadService] 步骤9: 清理临时目录`);
      if (fs.existsSync(tempDir)) {
        try {
          logger.info(`[GitUploadService] 正在删除临时目录: ${tempDir}`);
          fs.rmSync(tempDir, { recursive: true, force: true });
          logger.info(`[GitUploadService] 临时目录清理完成: ${tempDir}`);
        } catch (cleanupError) {
          logger.warn(`[GitUploadService] 临时目录清理失败: ${tempDir}`);
          logger.warn(`[GitUploadService] 清理错误:`, cleanupError);
        }
      } else {
        logger.info(`[GitUploadService] 临时目录不存在，无需清理`);
      }
      logger.info(`[GitUploadService] ========== Git上传流程结束 ==========`);
    }
  }

  /**
   * 克隆Git仓库
   */
  private async cloneRepository(
    git: SimpleGit,
    options: GitConfig,
    tempDir: string
  ): Promise<void> {
    let cloneUrl = options.gitUrl;
    logger.info(`[GitUploadService] 开始处理认证方式: ${options.authType}`);

    // 处理不同的认证方式
    if (options.authType === 'https' && options.username && options.password) {
      // HTTPS认证：在URL中嵌入用户名和密码
      logger.info(`[GitUploadService] 使用HTTPS认证，用户名: ${options.username}`);
      const url = new URL(options.gitUrl);
      url.username = encodeURIComponent(options.username);  
      url.password = encodeURIComponent(options.password);
      cloneUrl = url.toString();
      logger.info(`[GitUploadService] HTTPS认证URL已构建`);
    } else if (options.authType === 'token' && options.token) {
      // Token认证：使用token作为密码
      const username = options.username || 'token';
      logger.info(`[GitUploadService] 使用Token认证，用户名: ${username}`);
      logger.info(`[GitUploadService] Token长度: ${options.token.length} 字符`);
      const url = new URL(options.gitUrl);
      url.username = username;
      url.password = encodeURIComponent(options.token);
      cloneUrl = url.toString();
      logger.info(`[GitUploadService] Token认证URL已构建`);
    } else {
      logger.info(`[GitUploadService] 使用SSH认证或无认证，保持原始URL`);
    }
    // SSH认证不需要修改URL，依赖系统配置的SSH密钥

    logger.info(`[GitUploadService] 开始克隆仓库到: ${tempDir}`);
    logger.info(`[GitUploadService] 克隆参数: 浅克隆(depth=1), 单分支`);
    
    try {
      await git.clone(cloneUrl, tempDir, {
        "--depth": "1", // 浅克隆
        "--single-branch": null,
      });
      logger.info(`[GitUploadService] 仓库克隆成功`);
    } catch (error) {
      logger.error(`[GitUploadService] 仓库克隆失败`);
      logger.error(`[GitUploadService] 克隆错误:`, error);
      throw error;
    }
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
    
    logger.info(`[GitUploadService] 尝试切换到分支: ${branch}`);
    
    try {
      // 首先检查分支是否存在
      const branches = await gitRepo.branch();
      const branchExists = branches.all.includes(branch) || branches.all.includes(`origin/${branch}`);
      
      if (branchExists) {
        // 分支存在，直接切换
        logger.info(`[GitUploadService] 分支 ${branch} 存在，切换到该分支`);
        await gitRepo.checkout(branch);
        logger.info(`[GitUploadService] 成功切换到现有分支: ${branch}`);
      } else {
        // 分支不存在，创建新分支
        logger.info(`[GitUploadService] 分支 ${branch} 不存在，创建新分支`);
        
        // 确保当前在主分支上
        const currentBranch = branches.current;
        logger.info(`[GitUploadService] 当前分支: ${currentBranch}`);
        
        // 创建并切换到新分支
        await gitRepo.checkout(['-b', branch]);
        logger.info(`[GitUploadService] 成功创建并切换到新分支: ${branch}`);
      }
    } catch (error: any) {
      logger.error(`[GitUploadService] 切换分支失败:`, error);
      
      // 如果上述方法都失败，尝试强制创建分支
      try {
        logger.info(`[GitUploadService] 尝试强制创建分支: ${branch}`);
        await gitRepo.checkout(['-B', branch]);
        logger.info(`[GitUploadService] 强制创建分支成功: ${branch}`);
      } catch (forceError: any) {
        logger.error(`[GitUploadService] 强制创建分支也失败:`, forceError);
        throw new Error(`无法切换到分支 ${branch}: ${error?.message || '未知错误'}`);
      }
    }
  }

  /**
   * 复制脚本文件到目标目录
   */
  private async copyScriptFiles(sourceDir: string, targetDir: string): Promise<void> {
    logger.info(`[GitUploadService] 开始复制脚本文件`);
    logger.info(`[GitUploadService] 源目录: ${sourceDir}`);
    logger.info(`[GitUploadService] 目标目录: ${targetDir}`);
    
    // 如果目标目录已有文件，先清空（排除.git目录）
    if (fs.existsSync(targetDir)) {
      logger.info(`[GitUploadService] 目标目录已存在，清理现有文件`);
      const files = fs.readdirSync(targetDir);
      logger.info(`[GitUploadService] 目标目录中有 ${files.length} 个项目`);
      for (const file of files) {
        if (file !== '.git') {
          const filePath = path.join(targetDir, file);
          logger.info(`[GitUploadService] 删除现有文件/目录: ${file}`);
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          logger.info(`[GitUploadService] 跳过 .git 目录`);
        }
      }
      logger.info(`[GitUploadService] 目标目录清理完成`);
    } else {
      logger.info(`[GitUploadService] 目标目录不存在`);
    }

    // 复制脚本文件
    logger.info(`[GitUploadService] 开始复制脚本文件`);
    await this.copyDirectoryContents(sourceDir, targetDir, ['.git']);
    logger.info(`[GitUploadService] 脚本文件复制完成`);
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
    logger.info(`[GitUploadService] 开始复制目录内容，共 ${files.length} 个项目`);
    logger.info(`[GitUploadService] 排除文件: ${excludeFiles.join(', ') || '无'}`);

    for (const file of files) {
      if (excludeFiles.includes(file)) {
        logger.info(`[GitUploadService] 跳过排除文件: ${file}`);
        continue;
      }

      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        logger.info(`[GitUploadService] 复制目录: ${file}`);
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
          logger.info(`[GitUploadService] 创建目标目录: ${file}`);
        }
        await this.copyDirectoryContents(sourcePath, targetPath, excludeFiles);
      } else {
        logger.info(`[GitUploadService] 复制文件: ${file} (${stat.size} bytes)`);
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
    logger.info(`[GitUploadService] 目录内容复制完成`);
  }

  /**
   * 配置Git用户信息
   */
  private async configureGitUser(
    git: SimpleGit,
    tempDir: string,
    options: GitConfig
  ): Promise<void> {
    const gitRepo = git.cwd(tempDir);
    
    logger.info(`[GitUploadService] 开始配置Git用户信息`);
    
    // 设置用户名和邮箱
    const username = options.username || 'FeedHub';
    const email = options.email || 'feedhub@example.com';
    
    logger.info(`[GitUploadService] 设置Git用户名: ${username}`);
    await gitRepo.addConfig('user.name', username);
    
    logger.info(`[GitUploadService] 设置Git用户邮箱: ${email}`);
    await gitRepo.addConfig('user.email', email);
    
    logger.info(`[GitUploadService] Git用户信息配置完成`);
  }

  /**
   * 提交并推送更改
   */
  private async commitAndPush(
    git: SimpleGit,
    tempDir: string,
    options: GitConfig
  ): Promise<string> {
    const gitRepo = git.cwd(tempDir);
    logger.info(`[GitUploadService] 开始提交并推送更改`);

    // 添加所有文件
    logger.info(`[GitUploadService] 添加所有文件到暂存区`);
    await gitRepo.add('.');
    logger.info(`[GitUploadService] 文件添加到暂存区完成`);

    // 检查是否有更改
    logger.info(`[GitUploadService] 检查文件更改状态`);
    const status = await gitRepo.status();
    logger.info(`[GitUploadService] 检测到 ${status.files.length} 个文件更改`);
    
    if (status.files.length === 0) {
      logger.warn(`[GitUploadService] 没有检测到文件更改，无需提交`);
      throw new Error('没有检测到文件更改，无需提交');
    }

    // 记录更改的文件
    status.files.forEach((file, index) => {
      logger.info(`[GitUploadService] 更改文件 ${index + 1}: ${file.path} (${file.index})`);
    });

    // 提交更改
    logger.info(`[GitUploadService] 开始提交更改`);
    logger.info(`[GitUploadService] 提交消息: ${options.defaultCommitMessage}`);
    const commitResult = await gitRepo.commit(options.defaultCommitMessage || '没填提交信息');
    logger.info(`[GitUploadService] 提交完成，提交哈希: ${commitResult.commit}`);
    
    // 推送到远程仓库
    logger.info(`[GitUploadService] 开始推送到远程仓库`);
    logger.info(`[GitUploadService] 推送目标: origin/${options.gitBranch}`);
    await gitRepo.push('origin', options.gitBranch);
    logger.info(`[GitUploadService] 推送完成`);

    return commitResult.commit;
  }

  /**
   * 验证Git配置
   */
  async validateGitConfig(options: GitConfig): Promise<ApiResponseData<void>> {
    try {
      logger.info(`[GitUploadService] 开始验证Git配置`);
      logger.info(`[GitUploadService] 验证参数:`, {
        gitUrl: options.gitUrl,
        gitBranch: options.gitBranch,
        authType: options.authType,
        hasToken: !!options.token,
        hasUsername: !!options.username,
        hasPassword: !!options.password
      });
      
      // 验证Git URL格式
      if (!this.isValidGitUrl(options.gitUrl)) {
        logger.error(`[GitUploadService] 验证失败: Git仓库地址格式不正确: ${options.gitUrl}`);
        return {
          success: false,
          message: 'Git仓库地址格式不正确',
          data: undefined,
        };
      }
      logger.info(`[GitUploadService] Git URL格式验证通过`);

      // 验证认证信息
      logger.info(`[GitUploadService] 验证认证方式: ${options.authType}`);
      if (options.authType === 'https' && (!options.username || !options.password)) {
        logger.error(`[GitUploadService] 验证失败: HTTPS认证需要提供用户名和密码`);
        return {
          success: false,
          message: 'HTTPS认证需要提供用户名和密码',
          data: undefined,
        };
      }

      if (options.authType === 'token' && !options.token) {
        logger.error(`[GitUploadService] 验证失败: Token认证需要提供访问令牌`);
        return {
          success: false,
          message: 'Token认证需要提供访问令牌',
          data: undefined,
        };
      }
      
      if (options.authType === 'https') {
        logger.info(`[GitUploadService] HTTPS认证验证通过`);
      } else if (options.authType === 'token') {
        logger.info(`[GitUploadService] Token认证验证通过，Token长度: ${options.token?.length || 0}`);
      } else {
        logger.info(`[GitUploadService] SSH认证或其他认证方式，跳过额外验证`);
      }

      logger.info(`[GitUploadService] Git配置验证完成`);
      return {
        success: true,
        message: 'Git配置验证通过',
        data: undefined,
      };
    } catch (error) {
      logger.error(`[GitUploadService] Git配置验证异常:`, error);
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
    logger.info(`[GitUploadService] 验证Git URL格式: ${url}`);
    
    try {
      // 支持HTTPS和SSH格式的Git URL
      const httpsPattern = /^https:\/\/[\w\.-]+\/[\w\.-]+\/[\w\.-]+(\.git)?$/;
      const sshPattern = /^git@[\w\.-]+:[\w\.-]+\/[\w\.-]+(\.git)?$/;
      
      const isHttps = httpsPattern.test(url);
      const isSsh = sshPattern.test(url);
      const isValid = isHttps || isSsh;
      
      logger.info(`[GitUploadService] URL格式检查结果:`, {
        url,
        isHttps,
        isSsh,
        isValid
      });
      
      if (!isValid) {
        logger.warn(`[GitUploadService] 无效的Git URL格式: ${url}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error(`[GitUploadService] URL验证异常:`, error);
      return false;
    }
  }
}