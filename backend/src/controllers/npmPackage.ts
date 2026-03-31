import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { NpmPackageService } from "../services/NpmPackageService";
import { BaseController } from "./BaseController";
import { logger } from "../utils/logger";

@injectable()
export class NpmPackageController extends BaseController {
  constructor(@inject(TYPES.NpmPackageService) private npmPackageService: NpmPackageService) {
    super();
  }

  /**
   * 获取所有npm包列表
   */
  async getAllPackages(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.npmPackageService.getAllPackages();
    });
  }

  /**
   * 获取已安装的npm包列表
   */
  async getInstalledPackages(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.npmPackageService.getInstalledPackages();
    });
  }

  /**
   * 安装npm包
   */
  async installPackage(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { packageName, version } = req.body;

      if (!packageName || typeof packageName !== "string") {
        throw new Error("包名不能为空");
      }

      // 验证包名格式
      const packageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
      if (!packageNameRegex.test(packageName)) {
        throw new Error("包名格式不正确");
      }

      // 验证版本格式（如果提供）
      if (version && typeof version === "string") {
        const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/;
        if (version !== "latest" && !versionRegex.test(version)) {
          throw new Error("版本号格式不正确");
        }
      }

      return await this.npmPackageService.installPackage(packageName, version);
    });
  }

  /**
   * 卸载npm包
   */
  async uninstallPackage(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { name } = req.params;

      if (!name) {
        throw new Error("包名不能为空");
      }

      return await this.npmPackageService.uninstallPackage(name);
    });
  }

  /**
   * 获取包统计信息
   */
  async getPackageStats(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.npmPackageService.getStats();
    });
  }
}
