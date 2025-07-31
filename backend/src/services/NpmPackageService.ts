import { injectable } from "inversify";
import NpmPackage, {
  NpmPackageAttributes
} from "../models/NpmPackage";
import { ApiResponseData } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

@injectable()
export class NpmPackageService {
  private readonly packagesDir: string;
  private readonly maxPackageSize = 50 * 1024 * 1024; // 50MB
  private readonly maxDependencies = 20;

  constructor() {
    // 优先从环境变量读取自定义包存放目录
    const envPackagesDir = process.env.CUSTOM_PACKAGES_DIR;
    
    if (envPackagesDir) {
      // 如果环境变量设置了自定义包目录，使用绝对路径或相对于当前工作目录的路径
      this.packagesDir = path.isAbsolute(envPackagesDir) 
        ? envPackagesDir 
        : path.join(process.cwd(), envPackagesDir);
    } else {
      // 如果环境变量未设置，默认使用项目根目录下的custom_packages目录
      const cwd = process.cwd();
      if (cwd.endsWith('/backend') || cwd.endsWith('\\backend')) {
        // 如果当前在backend目录，则使用上级目录的custom_packages
        this.packagesDir = path.join(path.dirname(cwd), "custom_packages");
      } else {
        // 否则使用当前目录的custom_packages
        this.packagesDir = path.join(cwd, "custom_packages");
      }
    }
    
    this.ensurePackagesDirectory();
  }

  private ensurePackagesDirectory(): void {
    if (!fs.existsSync(this.packagesDir)) {
      fs.mkdirSync(this.packagesDir, { recursive: true });
      logger.info(`[NpmPackageService] 创建自定义包目录: ${this.packagesDir}`);
      // 创建package.json
      const packageJson = {
        name: "feedhub-custom-packages",
        version: "1.0.0",
        description: "Custom packages for FeedHub scripts",
        private: true,
      };
      fs.writeFileSync(
        path.join(this.packagesDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
    } else {
      logger.info(`[NpmPackageService] 使用自定义包目录: ${this.packagesDir}`);
    }
  }

  async getAllPackages(): Promise<ApiResponseData<NpmPackageAttributes[]>> {
    try {
      const packages = await NpmPackage.findAll({
        order: [["createdAt", "DESC"]],
      });
      return {
        success: true,
        data: packages.map((pkg) => pkg.toJSON()),
        message: "获取包列表成功",
      };
    } catch (error) {
      logger.error("获取npm包列表失败:", error);
      return {
        success: false,
        data: [],
        message: "获取包列表失败",
      };
    }
  }

  async getInstalledPackages(): Promise<ApiResponseData<NpmPackageAttributes[]>> {
    try {
      const packages = await NpmPackage.findAll({
        where: { status: "installed" },
        order: [["lastUsed", "DESC"]],
      });
      return {
        success: true,
        data: packages.map((pkg) => pkg.toJSON()),
        message: "获取已安装包列表成功",
      };
    } catch (error) {
      logger.error("获取已安装npm包列表失败:", error);
      return {
        success: false,
        data: [],
        message: "获取已安装包列表失败",
      };
    }
  }

  async installPackage(
    packageName: string,
    version?: string
  ): Promise<ApiResponseData<NpmPackageAttributes>> {
    try {
      // 检查是否已存在
      const existingPackage = await NpmPackage.findOne({ where: { name: packageName } });
      if (existingPackage) {
        return {
          success: false,
          data: undefined,
          message: `包 ${packageName} 已存在`,
        };
      }

      // 先获取包的版本信息
      let actualVersion = version;
      if (!actualVersion) {
        try {
          const { stdout } = await execAsync(`npm view ${packageName} version`, {
            timeout: 30000,
          });
          actualVersion = stdout.trim();
        } catch (error) {
          logger.warn(`获取包版本失败: ${packageName}`, error);
          actualVersion = "0.0.0"; // 使用默认版本
        }
      }

      // 创建安装记录
      const packageRecord = await NpmPackage.create({
        name: packageName,
        version: actualVersion,
        status: "installing",
        usageCount: 0,
        isWhitelisted: true,
      });

      try {
        // 执行npm安装
        const installCommand = version
          ? `npm install ${packageName}@${version} --save`
          : `npm install ${packageName} --save`;

        logger.info(`开始安装npm包: ${installCommand}`);
        const { stdout, stderr } = await execAsync(installCommand, {
          cwd: this.packagesDir,
          timeout: 120000, // 2分钟超时
        });

        if (stderr && !stderr.includes("WARN")) {
          throw new Error(stderr);
        }

        // 获取包信息
        const packageInfo = await this.getPackageInfo(packageName);
        const packagePath = path.join(this.packagesDir, "node_modules", packageName);
        const packageSize = await this.getDirectorySize(packagePath);

        // 安全检查包大小
        if (packageSize > this.maxPackageSize) {
          await this.uninstallPackageFiles(packageName);
          throw new Error(
            `包大小 ${Math.round(packageSize / 1024 / 1024)}MB 超过限制 ${Math.round(this.maxPackageSize / 1024 / 1024)}MB`
          );
        }

        // 更新包记录
        await packageRecord.update({
          version: packageInfo.version,
          description: packageInfo.description,
          status: "installed",
          installPath: packagePath,
          size: packageSize,
          dependencies: JSON.stringify(packageInfo.dependencies || {}),
          installTime: new Date(),
        });

        logger.info(`npm包安装成功: ${packageName}@${packageInfo.version}`);
        return {
          success: true,
          data: packageRecord.toJSON(),
          message: `包 ${packageName} 安装成功`,
        };
      } catch (installError) {
        // 安装失败，更新状态
        await packageRecord.update({ status: "failed" });
        logger.error(`npm包安装失败: ${packageName}`, installError);
        return {
          success: false,
          data: undefined,
          message: `包 ${packageName} 安装失败: ${(installError as Error).message}`,
        };
      }
    } catch (error) {
      logger.error("安装npm包失败:", error);
      return {
        success: false,
        data: undefined,
        message: "安装包失败",
      };
    }
  }

  async uninstallPackage(packageName: string): Promise<ApiResponseData<boolean>> {
    try {
      const packageRecord = await NpmPackage.findOne({ where: { name: packageName } });
      if (!packageRecord) {
        return {
          success: false,
          data: false,
          message: `包 ${packageName} 不存在`,
        };
      }

      // 更新状态为卸载中
      await packageRecord.update({ status: "uninstalling" });

      try {
        // 执行npm卸载
        await execAsync(`npm uninstall ${packageName}`, {
          cwd: this.packagesDir,
          timeout: 60000,
        });

        // 删除数据库记录
        await packageRecord.destroy();

        logger.info(`npm包卸载成功: ${packageName}`);
        return {
          success: true,
          data: true,
          message: `包 ${packageName} 卸载成功`,
        };
      } catch (uninstallError) {
        // 卸载失败，恢复状态
        await packageRecord.update({ status: "installed" });
        logger.error(`npm包卸载失败: ${packageName}`, uninstallError);
        return {
          success: false,
          data: false,
          message: `包 ${packageName} 卸载失败: ${(uninstallError as Error).message}`,
        };
      }
    } catch (error) {
      logger.error("卸载npm包失败:", error);
      return {
        success: false,
        data: false,
        message: "卸载包失败",
      };
    }
  }

  async updatePackageUsage(packageName: string): Promise<void> {
    try {
      const packageRecord = await NpmPackage.findOne({ where: { name: packageName } });
      if (packageRecord) {
        await packageRecord.update({
          lastUsed: new Date(),
          usageCount: packageRecord.usageCount + 1,
        });
      }
    } catch (error) {
      logger.error(`更新包使用统计失败: ${packageName}`, error);
    }
  }

  getPackagesDirectory(): string {
    return this.packagesDir;
  }

  private async uninstallPackageFiles(packageName: string): Promise<void> {
    try {
      await execAsync(`npm uninstall ${packageName}`, {
        cwd: this.packagesDir,
        timeout: 60000,
      });
    } catch (error) {
      logger.warn(`清理包文件失败: ${packageName}`, error);
    }
  }

  private async getPackageInfo(packageName: string): Promise<any> {
    try {
      const packageJsonPath = path.join(
        this.packagesDir,
        "node_modules",
        packageName,
        "package.json"
      );
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      return {
        version: packageJson.version,
        description: packageJson.description,
        dependencies: packageJson.dependencies,
      };
    } catch (error) {
      logger.warn(`获取包信息失败: ${packageName}`, error);
      return { version: "unknown", description: "", dependencies: {} };
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`du -sb "${dirPath}"`);
      return parseInt(stdout.split("\t")[0]);
    } catch (error) {
      logger.warn(`获取目录大小失败: ${dirPath}`, error);
      return 0;
    }
  }
}
