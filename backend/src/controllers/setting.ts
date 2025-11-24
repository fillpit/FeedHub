import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../core/types";
import { SettingService } from "../services/SettingService";
import { TranslationService } from "../services/TranslationService";
import { BaseController } from "./BaseController";

@injectable()
export class SettingController extends BaseController {
  constructor(
    @inject(TYPES.SettingService) private settingService: SettingService,
    @inject(TYPES.TranslationService) private translationService: TranslationService
  ) {
    super();
  }

  async get(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const userId = req.user?.userId;
      const role = Number(req.user?.role);
      return await this.settingService.getSettings(userId, role);
    });
  }

  async save(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const userId = req.user?.userId;
      const role = Number(req.user?.role);
      return await this.settingService.saveSettings(userId, role, req.body);
    });
  }

  async testTranslation(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const text = (req.body?.text as string) || "";
      const translatedText = await this.translationService.translateBilingual(text);
      return { success: true, data: { translatedText }, message: "翻译成功" } as any;
    });
  }
}
