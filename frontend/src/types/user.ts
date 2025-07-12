export interface GlobalSettingAttributes {
  httpProxyHost: string;
  httpProxyPort: string | number;
  isProxyEnabled: boolean;
  AdminUserCode: number;
  CommonUserCode: number;
}

export interface UserSettingAttributes {
  cloud115Cookie: string;
  quarkCookie: string;
}

export interface UserSettingStore {
  globalSetting: GlobalSettingAttributes | null;
  userSettings: UserSettingAttributes;
  displayStyle: "table" | "card";
  imagesSource: "proxy" | "local";
}
