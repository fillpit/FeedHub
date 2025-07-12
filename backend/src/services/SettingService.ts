import { injectable, inject } from "inversify";
import GlobalSetting from "../models/GlobalSetting";

@injectable()
export class SettingService {
  constructor() {}

  async getSettings(userId: string | undefined, role: number | undefined) {
    if (!userId) {
      throw new Error("用户ID无效");
    }

    const globalSetting = await GlobalSetting.findOne();
    return {
      data: {
        globalSetting: role === 1 ? globalSetting : null,
      },
    };
  }

  async saveSettings(userId: string | undefined, role: number | undefined, settings: any) {
    if (!userId) {
      throw new Error("用户ID无效");
    }

    const { globalSetting } = settings;

    if (role === 1 && globalSetting) {
      await GlobalSetting.update(globalSetting, { where: {} });
    }
    await this.updateSettings();
    return { message: "保存成功" };
  }

  async updateSettings(/* 参数 */): Promise<void> {
    // ... 其他代码 ...

    // ... 其他代码 ...
  }
}
