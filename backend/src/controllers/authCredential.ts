import { Request, Response } from "express";
import AuthCredentialService from "../services/AuthCredentialService";

class AuthCredentialController {
  /** 获取所有授权信息 */
  async getAll(req: Request, res: Response) {
    const result = await AuthCredentialService.getAll();
    res.json(result);
  }

  /** 获取单个授权信息 */
  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const result = await AuthCredentialService.getById(id);
    res.json(result);
  }

  /** 创建授权信息 */
  async create(req: Request, res: Response) {
    const result = await AuthCredentialService.create(req.body);
    res.json(result);
  }

  /** 更新授权信息 */
  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const result = await AuthCredentialService.update(id, req.body);
    res.json(result);
  }

  /** 删除授权信息 */
  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    const result = await AuthCredentialService.delete(id);
    res.json(result);
  }
}

export default new AuthCredentialController();
