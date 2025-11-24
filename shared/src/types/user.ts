// 用户相关的共享类型定义

// 用户基本信息
export interface UserInfo {
  id: number;
  userId: string;
  username: string;
  role: number;
  createdAt?: string;
  updatedAt?: string;
}

// 用户角色枚举
export enum UserRole {
  NORMAL_USER = 0,
  ADMIN = 1,
}

// 登录请求参数
export interface LoginRequest {
  username: string;
  password: string;
}

// 注册请求参数
export interface RegisterRequest {
  username: string;
  password: string;
  registerCode: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user?: UserInfo;
  expiresIn?: number;
}

// 用户设置
export interface UserSettingAttributes {
  id?: number;
  userId: string;
  cloud115Cookie: string;
  quarkCookie: string;
  username?: string;
  email?: string;
}

// 全局设置
export interface GlobalSettingAttributes {
  httpProxyHost: string;
  httpProxyPort: number | string;
  isProxyEnabled: boolean;
  AdminUserCode: number;
  CommonUserCode: number;
  // OPDS 设置
  opdsEnabled?: boolean;
  opdsServerUrl?: string;
  opdsUsername?: string;
  opdsPassword?: string;
  // 翻译配置
  translationTargetLanguage?: string;
  translationPrompt?: string;
  translationApiBase?: string;
  translationApiKey?: string;
  translationModel?: string;
}

// 通知设置
export interface NotificationSettings {
  // Bark 通知设置
  bark: {
    enabled: boolean;
    serverUrl: string;
    deviceKey: string;
    sound?: string;
    icon?: string;
    group?: string;
  };

  // 邮件通知设置
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    username: string;
    password: string;
    fromEmail: string;
    toEmail: string;
  };

  // Gotify 通知设置
  gotify: {
    enabled: boolean;
    serverUrl: string;
    appToken: string;
    priority?: number;
  };

  // 企业微信通知设置
  wechatWork: {
    enabled: boolean;
    webhookUrl: string;
    mentionedList?: string[];
    mentionedMobileList?: string[];
  };

  // 钉钉通知设置
  dingtalk: {
    enabled: boolean;
    webhookUrl: string;
    secret?: string;
    atMobiles?: string[];
    atUserIds?: string[];
    isAtAll?: boolean;
  };

  // 飞书通知设置
  feishu: {
    enabled: boolean;
    webhookUrl: string;
    secret?: string;
    atUserIds?: string[];
    atMobiles?: string[];
    atAll?: boolean;
  };

  // 通知触发条件
  triggers: {
    newFeedItems: boolean; // 新的订阅内容
    feedUpdateErrors: boolean; // 订阅更新错误
    systemAlerts: boolean; // 系统警告
  };
}

// 设置保存请求
export interface SaveSettingsRequest {
  globalSettings?: Partial<GlobalSettingAttributes>;
  userSettings?: Partial<UserSettingAttributes>;
  notificationSettings?: Partial<NotificationSettings>;
}
