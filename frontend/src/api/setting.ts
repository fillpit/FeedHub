import request from "@/utils/request";
import type { GlobalSettingAttributes, UserSettingAttributes } from "@/types";

export const settingApi = {
  getSetting: () => {
    return request.get<{
      userSettings: UserSettingAttributes;
      globalSetting: GlobalSettingAttributes;
    }>("/api/setting/get");
  },
  saveSetting: (data: {
    userSettings: UserSettingAttributes;
    globalSetting?: GlobalSettingAttributes | null;
  }) => {
    return request.post("/api/setting/save", data);
  },
};
