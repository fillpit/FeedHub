import request from "@/utils/request";
import type { GlobalSettingAttributes, UserSettingAttributes } from "@/types";
import type { NotificationSettings } from "@feedhub/shared";

export const settingApi = {
  getSetting: () => {
    return request.get<{
      userSettings: UserSettingAttributes;
      globalSetting: GlobalSettingAttributes;
      notificationSettings?: NotificationSettings;
    }>("/api/setting/get");
  },
  saveSetting: (data: {
    userSettings: UserSettingAttributes;
    globalSetting?: GlobalSettingAttributes | null;
    notificationSettings?: NotificationSettings | null;
  }) => {
    return request.post("/api/setting/save", data, {
      showSuccessMessage: true,
      successMessage: "设置更新成功！",
    });
  },
};
