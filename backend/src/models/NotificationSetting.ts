import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface NotificationSettingAttributes {
  id: number;
  userId: string;
  // Bark 通知设置
  barkEnabled: boolean;
  barkServerUrl: string;
  barkDeviceKey: string;
  barkSound?: string;
  barkIcon?: string;
  barkGroup?: string;

  // 邮件通知设置
  emailEnabled: boolean;
  emailSmtpHost: string;
  emailSmtpPort: number;
  emailSmtpSecure: boolean;
  emailUsername: string;
  emailPassword: string;
  emailFromEmail: string;
  emailToEmail: string;

  // Gotify 通知设置
  gotifyEnabled: boolean;
  gotifyServerUrl: string;
  gotifyAppToken: string;
  gotifyPriority?: number;

  // 企业微信通知设置
  wechatWorkEnabled: boolean;
  wechatWorkWebhookUrl: string;
  wechatWorkMentionedList?: string; // JSON string
  wechatWorkMentionedMobileList?: string; // JSON string

  // 钉钉通知设置
  dingtalkEnabled: boolean;
  dingtalkWebhookUrl: string;
  dingtalkSecret?: string;
  dingtalkAtMobiles?: string; // JSON string
  dingtalkAtUserIds?: string; // JSON string
  dingtalkIsAtAll?: boolean;

  // 飞书通知设置
  feishuEnabled: boolean;
  feishuWebhookUrl: string;
  feishuSecret?: string;
  feishuAtUserIds?: string; // JSON string
  feishuAtMobiles?: string; // JSON string
  feishuAtAll?: boolean;

  // 通知触发条件
  triggerNewFeedItems: boolean;
  triggerFeedUpdateErrors: boolean;
  triggerSystemAlerts: boolean;
}

interface NotificationSettingCreationAttributes
  extends Optional<NotificationSettingAttributes, "id"> {}

class NotificationSetting
  extends Model<NotificationSettingAttributes, NotificationSettingCreationAttributes>
  implements NotificationSettingAttributes
{
  public id!: number;
  public userId!: string;

  // Bark 通知设置
  public barkEnabled!: boolean;
  public barkServerUrl!: string;
  public barkDeviceKey!: string;
  public barkSound?: string;
  public barkIcon?: string;
  public barkGroup?: string;

  // 邮件通知设置
  public emailEnabled!: boolean;
  public emailSmtpHost!: string;
  public emailSmtpPort!: number;
  public emailSmtpSecure!: boolean;
  public emailUsername!: string;
  public emailPassword!: string;
  public emailFromEmail!: string;
  public emailToEmail!: string;

  // Gotify 通知设置
  public gotifyEnabled!: boolean;
  public gotifyServerUrl!: string;
  public gotifyAppToken!: string;
  public gotifyPriority?: number;

  // 企业微信通知设置
  public wechatWorkEnabled!: boolean;
  public wechatWorkWebhookUrl!: string;
  public wechatWorkMentionedList?: string;
  public wechatWorkMentionedMobileList?: string;

  // 钉钉通知设置
  public dingtalkEnabled!: boolean;
  public dingtalkWebhookUrl!: string;
  public dingtalkSecret?: string;
  public dingtalkAtMobiles?: string;
  public dingtalkAtUserIds?: string;
  public dingtalkIsAtAll?: boolean;

  // 飞书通知设置
  public feishuEnabled!: boolean;
  public feishuWebhookUrl!: string;
  public feishuSecret?: string;
  public feishuAtUserIds?: string;
  public feishuAtMobiles?: string;
  public feishuAtAll?: boolean;

  // 通知触发条件
  public triggerNewFeedItems!: boolean;
  public triggerFeedUpdateErrors!: boolean;
  public triggerSystemAlerts!: boolean;
}

NotificationSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: "users",
        key: "userId",
      },
    },
    // Bark 通知设置
    barkEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    barkServerUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "https://api.day.app",
    },
    barkDeviceKey: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    barkSound: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    barkIcon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    barkGroup: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // 邮件通知设置
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailSmtpHost: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    emailSmtpPort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 587,
    },
    emailSmtpSecure: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    emailUsername: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    emailPassword: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    emailFromEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    emailToEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },

    // Gotify 通知设置
    gotifyEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    gotifyServerUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    gotifyAppToken: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    gotifyPriority: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5,
    },

    // 企业微信通知设置
    wechatWorkEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wechatWorkWebhookUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    wechatWorkMentionedList: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    wechatWorkMentionedMobileList: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // 钉钉通知设置
    dingtalkEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    dingtalkWebhookUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    dingtalkSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dingtalkAtMobiles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dingtalkAtUserIds: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dingtalkIsAtAll: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    // 飞书通知设置
    feishuEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    feishuWebhookUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    feishuSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    feishuAtUserIds: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    feishuAtMobiles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    feishuAtAll: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    // 通知触发条件
    triggerNewFeedItems: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    triggerFeedUpdateErrors: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    triggerSystemAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "NotificationSetting",
    tableName: "notification_settings",
  }
);

export default NotificationSetting;
