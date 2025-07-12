import { defineStore } from "pinia";
import type {
  UserSettingStore,
  GlobalSettingAttributes,
  UserSettingAttributes,
} from "@/types/user";
import { settingApi } from "@/api/setting";
import { ElMessage } from "element-plus";

export const useUserSettingStore = defineStore("user", {
  state: (): UserSettingStore => ({
    globalSetting: null,
    userSettings: {
      cloud115Cookie: "",
      quarkCookie: "",
    },
    displayStyle: (localStorage.getItem("display_style") as "table" | "card") || "card",
    imagesSource: (localStorage.getItem("images_source") as "proxy" | "local") || "proxy",
  }),

  actions: {
    async getSettings() {
      const { data } = await settingApi.getSetting();
      if (data) {
        this.globalSetting = data.globalSetting;
        this.userSettings = data.userSettings;
      }
    },

    async saveSettings(settings: {
      globalSetting?: GlobalSettingAttributes | null;
      userSettings: UserSettingAttributes;
    }) {
      try {
        await settingApi.saveSetting(settings);
        await this.getSettings();
      } catch (error) {
        console.log(error);
        throw error;
      }
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
