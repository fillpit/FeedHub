import { injectable, inject } from "inversify";
import { Request, Response } from "express";
import { TYPES } from "../core/types";
import { AuthCredentialService } from "../services/AuthCredentialService";
import { BaseController } from "./BaseController";

@injectable()
export class AuthCredentialController extends BaseController {
    constructor(@inject(TYPES.AuthCredentialService) private authCredentialService: AuthCredentialService) {
    super();
  }

  /** 获取所有授权信息 */
  async getAll(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.authCredentialService.getAll();
    });
  }

  /** 获取单个授权信息 */
  async getById(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.authCredentialService.getById(id);
    });
  }

  /** 创建授权信息 */
  async create(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      return await this.authCredentialService.create(req.body);
    });
  }

  /** 更新授权信息 */
  async update(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.authCredentialService.update(id, req.body);
    });
  }

  /** 删除授权信息 */
  async delete(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const id = Number(req.params.id);
      return await this.authCredentialService.delete(id);
    });
  }
}

