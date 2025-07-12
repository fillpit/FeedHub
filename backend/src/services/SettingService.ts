import { injectable, inject } from "inversify";
import UserSetting from "../models/UserSetting";
import GlobalSetting from "../models/GlobalSetting";

@injectable()
export class SettingService {
  constructor() {}

  async getSettings(userId: string | undefined, role: number | undefined) {
    if (!userId) {
      throw new Error("用户ID无效");
    }

    let userSettings = await UserSetting.findOne({ where: { userId: userId.toString() } });
    if (!userSettings) {
      userSettings = await UserSetting.create({
        userId: userId.toString(),
        cloud115Cookie: "",
        quarkCookie: "",
      });
    }

    const globalSetting = await GlobalSetting.findOne();
    return {
      data: {
        userSettings,
        globalSetting: role === 1 ? globalSetting : null,
      },
    };
  }

  async saveSettings(userId: string | undefined, role: number | undefined, settings: any) {
    if (!userId) {
      throw new Error("用户ID无效");
    }

    const { userSettings, globalSetting } = settings;
    await UserSetting.update(userSettings, { where: { userId: userId.toString() } });

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
