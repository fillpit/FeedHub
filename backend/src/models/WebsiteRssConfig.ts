import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// 字段抓取配置
export interface SelectorField {
  selector: string;    // 选择器表达式
  extractType: "text" | "attr"; // 抓取类型：文本值或属性值
  attrName?: string;   // 当extractType为attr时，指定属性名
}

export interface WebsiteRssSelector {
  selectorType: "css" | "xpath"; // 选择器类型：CSS 或 XPath
  container: string;  // 文章容器选择器（必填）
  title: SelectorField;       // 标题选择器配置
  date?: SelectorField;       // 日期选择器配置（可选）
  content: SelectorField;     // 内容选择器配置
  link?: SelectorField;       // 链接选择器配置（可选）
  dateFormat?: string; // 日期格式（可选）
  author?: SelectorField;     // 作者选择器配置（可选）
  image?: SelectorField;      // 文章封面图片选择器配置（可选）
}

// 授权配置接口
export interface WebsiteRssAuth {
  enabled: boolean; // 是否启用授权
  authType: "none" | "cookie" | "basic" | "bearer" | "custom"; // 授权类型
  cookie?: string; // Cookie 字符串
  basicAuth?: {
    username: string;
    password: string;
  };
  bearerToken?: string; // Bearer Token
  customHeaders?: Record<string, string>; // 自定义请求头
}

// 抓取模式
export type FetchMode = "selector" | "script";

// 脚本抓取配置
export interface WebsiteRssScript {
  enabled: boolean; // 是否启用脚本抓取
  script: string; // JavaScript脚本内容
  timeout?: number; // 脚本执行超时时间（毫秒）
}

export interface WebsiteRssConfigAttributes {
  id: number;
  userId: string; // 用户ID
  key: string;
  title: string;
  url: string;
  fetchMode: FetchMode; // 抓取模式：selector 或 script
  selector: WebsiteRssSelector; // 包含各种选择器
  script: WebsiteRssScript; // 脚本抓取配置
  auth: WebsiteRssAuth; // 授权配置
  authCredentialId?: number; // 新增：授权信息ID
  lastContent: string; // 上次抓取的内容
  lastFetchTime: Date;
  fetchInterval: number; // 抓取间隔（分钟）
  rssDescription: string;
  favicon: string;
}

interface WebsiteRssConfigCreationAttributes extends Optional<WebsiteRssConfigAttributes, "id" | "lastContent" | "lastFetchTime"> {}

class WebsiteRssConfig
  extends Model<WebsiteRssConfigAttributes, WebsiteRssConfigCreationAttributes>
  implements WebsiteRssConfigAttributes
{
  public id!: number;
  public userId!: string;
  public key!: string;
  public title!: string;
  public url!: string;
  public fetchMode!: FetchMode;
  public selector!: WebsiteRssSelector;
  public script!: WebsiteRssScript;
  public auth!: WebsiteRssAuth;
  public authCredentialId?: number;
  public lastContent!: string;
  public lastFetchTime!: Date;
  public fetchInterval!: number;
  public rssDescription!: string;
  public favicon!: string;
}

WebsiteRssConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "用户ID"
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fetchMode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "selector", // 默认为选择器模式
    },
    selector: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    script: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        enabled: false,
        script: "",
        timeout: 30000
      },
    },
    auth: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        enabled: false,
        authType: "none"
      },
    },
    authCredentialId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "授权信息ID"
    },

    lastContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastFetchTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fetchInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60, // 默认60分钟
    },
    rssDescription: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    favicon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "WebsiteRssConfig",
    tableName: "website_rss_configs",
  }
);

export default WebsiteRssConfig;