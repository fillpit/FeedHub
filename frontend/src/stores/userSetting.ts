import { defineStore } from "pinia";
import type {
  GlobalSettingAttributes,
  UserSettingAttributes,
  NotificationSettings,
} from "@feedhub/shared";

// 本地store状态接口
interface UserSettingStore {
  globalSetting: GlobalSettingAttributes | null;
  userSettings: UserSettingAttributes;
  notificationSettings: NotificationSettings | null;
  displayStyle: "table" | "card";
  imagesSource: "proxy" | "local";
}
import { settingApi } from "@/api/setting";
import { ElMessage } from "element-plus";

export const useUserSettingStore = defineStore("user", {
  state: (): UserSettingStore => ({
    globalSetting: null,
    userSettings: {
      userId: "",
      cloud115Cookie: "",
      quarkCookie: "",
    },
    notificationSettings: null,
    displayStyle: (localStorage.getItem("display_style") as "table" | "card") || "card",
    imagesSource: (localStorage.getItem("images_source") as "proxy" | "local") || "proxy",
  }),

  actions: {
    async getSettings() {
      const { data } = await settingApi.getSetting();
      if (data) {
        this.globalSetting = data.globalSetting;
        this.userSettings = data.userSettings;
        this.notificationSettings = data.notificationSettings || this.getDefaultNotificationSettings();
      }
    },

    async saveSettings(settings: {
      globalSetting?: GlobalSettingAttributes | null;
      userSettings: UserSettingAttributes;
      notificationSettings?: NotificationSettings | null;
    }) {
      try {
        await settingApi.saveSetting(settings);
        await this.getSettings();
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    async saveNotificationSettings(notificationSettings: NotificationSettings) {
      try {
        await this.saveSettings({
          userSettings: this.userSettings,
          notificationSettings,
        });
        this.notificationSettings = notificationSettings;
        ElMessage.success('通知设置保存成功');
      } catch (error) {
        console.error('保存通知设置失败:', error);
        ElMessage.error('保存通知设置失败');
        throw error;
      }
    },

    getDefaultNotificationSettings(): NotificationSettings {
      return {
        bark: {
          enabled: false,
          serverUrl: 'https://api.day.app',
          deviceKey: '',
          sound: '',
          icon: '',
          group: ''
        },
        email: {
          enabled: false,
          smtpHost: '',
          smtpPort: 587,
          smtpSecure: true,
          username: '',
          password: '',
          fromEmail: '',
          toEmail: ''
        },
        gotify: {
          enabled: false,
          serverUrl: '',
          appToken: '',
          priority: 5
        },
        wechatWork: {
          enabled: false,
          webhookUrl: '',
          mentionedList: [],
          mentionedMobileList: []
        },
        dingtalk: {
          enabled: false,
          webhookUrl: '',
          secret: '',
          atMobiles: [],
          atUserIds: [],
          isAtAll: false
        },
        feishu: {
          enabled: false,
          webhookUrl: '',
          secret: '',
          atUserIds: [],
          atMobiles: [],
          atAll: false
        },
        triggers: {
          newFeedItems: true,
          feedUpdateErrors: true,
          systemAlerts: true
        }
      };
    },

    setDisplayStyle(style: "table" | "card") {
      this.displayStyle = style;
      localStorage.setItem("display_style", style);
      ElMessage.success(`切换成功，当前为${style === "table" ? "列表" : "卡片"}模式`);
    },

    setImagesSource(source: "proxy" | "local") {
      this.imagesSource = source;
      localStorage.setItem("images_source", source);
      ElMessage.success(`切换成功，图片模式当前为${source === "proxy" ? "代理" : "直连"}模式`);
    },
  },
});
