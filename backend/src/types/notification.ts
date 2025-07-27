// 通知设置接口
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
    newFeedItems: boolean;  // 新的订阅内容
    feedUpdateErrors: boolean;  // 订阅更新错误
    systemAlerts: boolean;  // 系统警告
  };
}