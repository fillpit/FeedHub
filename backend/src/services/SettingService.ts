import { injectable, inject } from "inversify";
import GlobalSetting from "../models/GlobalSetting";
import UserSetting from "../models/UserSetting";
import NotificationSetting from "../models/NotificationSetting";
import type { NotificationSettings } from "@feedhub/shared";

@injectable()
export class SettingService {
  constructor() {}

  async getSettings(userId: string | undefined, role: number | undefined) {
    if (!userId) {
      throw new Error("用户ID无效");
    }

    const globalSetting = await GlobalSetting.findOne();
    const userSetting = await UserSetting.findOne({ where: { userId } });
    const notificationSetting = await NotificationSetting.findOne({ where: { userId } });
    
    return {
      data: {
        globalSetting: role === 1 ? globalSetting : null,
        userSettings: userSetting ? {
          cloud115Cookie: userSetting.cloud115Cookie,
          quarkCookie: userSetting.quarkCookie,
          username: userSetting.username,
          email: userSetting.email,
        } : {
          cloud115Cookie: "",
          quarkCookie: "",
          username: "",
          email: "",
        },
        notificationSettings: notificationSetting ? this.convertToNotificationSettings(notificationSetting) : null,
      },
    };
  }

  async saveSettings(userId: string | undefined, role: number | undefined, settings: any) {
    if (!userId) {
      throw new Error("用户ID无效");
    }

    const { globalSetting, userSettings, notificationSettings } = settings;

    // 保存全局设置（仅管理员）
    if (role === 1 && globalSetting) {
      await GlobalSetting.update(globalSetting, { where: {} });
    }
    
    // 保存用户设置
    if (userSettings) {
      await UserSetting.upsert({
        userId,
        cloud115Cookie: userSettings.cloud115Cookie || "",
        quarkCookie: userSettings.quarkCookie || "",
        username: userSettings.username,
        email: userSettings.email,
      });
    }
    
    // 保存通知设置
    if (notificationSettings) {
      const notificationData = this.convertFromNotificationSettings(userId, notificationSettings);
      await NotificationSetting.upsert(notificationData);
    }
    
    await this.updateSettings();
    return { message: "保存成功" };
  }

  private convertToNotificationSettings(setting: NotificationSetting): NotificationSettings {
    return {
      bark: {
        enabled: setting.barkEnabled,
        serverUrl: setting.barkServerUrl,
        deviceKey: setting.barkDeviceKey,
        sound: setting.barkSound,
        icon: setting.barkIcon,
        group: setting.barkGroup,
      },
      email: {
        enabled: setting.emailEnabled,
        smtpHost: setting.emailSmtpHost,
        smtpPort: setting.emailSmtpPort,
        smtpSecure: setting.emailSmtpSecure,
        username: setting.emailUsername,
        password: setting.emailPassword,
        fromEmail: setting.emailFromEmail,
        toEmail: setting.emailToEmail,
      },
      gotify: {
        enabled: setting.gotifyEnabled,
        serverUrl: setting.gotifyServerUrl,
        appToken: setting.gotifyAppToken,
        priority: setting.gotifyPriority,
      },
      wechatWork: {
        enabled: setting.wechatWorkEnabled,
        webhookUrl: setting.wechatWorkWebhookUrl,
        mentionedList: setting.wechatWorkMentionedList ? JSON.parse(setting.wechatWorkMentionedList) : [],
        mentionedMobileList: setting.wechatWorkMentionedMobileList ? JSON.parse(setting.wechatWorkMentionedMobileList) : [],
      },
      dingtalk: {
        enabled: setting.dingtalkEnabled,
        webhookUrl: setting.dingtalkWebhookUrl,
        secret: setting.dingtalkSecret,
        atMobiles: setting.dingtalkAtMobiles ? JSON.parse(setting.dingtalkAtMobiles) : [],
        atUserIds: setting.dingtalkAtUserIds ? JSON.parse(setting.dingtalkAtUserIds) : [],
        isAtAll: setting.dingtalkIsAtAll,
      },
      feishu: {
        enabled: setting.feishuEnabled,
        webhookUrl: setting.feishuWebhookUrl,
        secret: setting.feishuSecret,
        atUserIds: setting.feishuAtUserIds ? JSON.parse(setting.feishuAtUserIds) : [],
        atMobiles: setting.feishuAtMobiles ? JSON.parse(setting.feishuAtMobiles) : [],
        atAll: setting.feishuAtAll,
      },
      triggers: {
        newFeedItems: setting.triggerNewFeedItems,
        feedUpdateErrors: setting.triggerFeedUpdateErrors,
        systemAlerts: setting.triggerSystemAlerts,
      },
    };
  }

  private convertFromNotificationSettings(userId: string, settings: NotificationSettings): any {
    return {
      userId,
      // Bark 通知设置
      barkEnabled: settings.bark.enabled,
      barkServerUrl: settings.bark.serverUrl,
      barkDeviceKey: settings.bark.deviceKey,
      barkSound: settings.bark.sound,
      barkIcon: settings.bark.icon,
      barkGroup: settings.bark.group,
      
      // 邮件通知设置
      emailEnabled: settings.email.enabled,
      emailSmtpHost: settings.email.smtpHost,
      emailSmtpPort: settings.email.smtpPort,
      emailSmtpSecure: settings.email.smtpSecure,
      emailUsername: settings.email.username,
      emailPassword: settings.email.password,
      emailFromEmail: settings.email.fromEmail,
      emailToEmail: settings.email.toEmail,
      
      // Gotify 通知设置
      gotifyEnabled: settings.gotify.enabled,
      gotifyServerUrl: settings.gotify.serverUrl,
      gotifyAppToken: settings.gotify.appToken,
      gotifyPriority: settings.gotify.priority,
      
      // 企业微信通知设置
      wechatWorkEnabled: settings.wechatWork.enabled,
      wechatWorkWebhookUrl: settings.wechatWork.webhookUrl,
      wechatWorkMentionedList: JSON.stringify(settings.wechatWork.mentionedList || []),
      wechatWorkMentionedMobileList: JSON.stringify(settings.wechatWork.mentionedMobileList || []),
      
      // 钉钉通知设置
      dingtalkEnabled: settings.dingtalk.enabled,
      dingtalkWebhookUrl: settings.dingtalk.webhookUrl,
      dingtalkSecret: settings.dingtalk.secret,
      dingtalkAtMobiles: JSON.stringify(settings.dingtalk.atMobiles || []),
      dingtalkAtUserIds: JSON.stringify(settings.dingtalk.atUserIds || []),
      dingtalkIsAtAll: settings.dingtalk.isAtAll,
      
      // 飞书通知设置
      feishuEnabled: settings.feishu.enabled,
      feishuWebhookUrl: settings.feishu.webhookUrl,
      feishuSecret: settings.feishu.secret,
      feishuAtUserIds: JSON.stringify(settings.feishu.atUserIds || []),
      feishuAtMobiles: JSON.stringify(settings.feishu.atMobiles || []),
      feishuAtAll: settings.feishu.atAll,
      
      // 通知触发条件
      triggerNewFeedItems: settings.triggers.newFeedItems,
      triggerFeedUpdateErrors: settings.triggers.feedUpdateErrors,
      triggerSystemAlerts: settings.triggers.systemAlerts,
    };
  }

  async updateSettings(/* 参数 */): Promise<void> {
    // ... 其他代码 ...

    // ... 其他代码 ...
  }
}
