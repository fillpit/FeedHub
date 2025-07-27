import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  SelectorField,
  WebsiteRssSelector,
  WebsiteRssAuth,
  FetchMode,
  WebsiteRssScript,
  WebsiteRssConfigAttributes,
  WebsiteRssConfigCreationAttributes
} from "@feedhub/shared";

// 重新导出类型以供其他模块使用
export {
  SelectorField,
  WebsiteRssSelector,
  WebsiteRssAuth,
  FetchMode,
  WebsiteRssScript,
  WebsiteRssConfigAttributes,
  WebsiteRssConfigCreationAttributes
};

// Sequelize 模型创建属性接口
interface ModelCreationAttributes extends Optional<WebsiteRssConfigAttributes, "id" | "lastContent" | "lastFetchTime"> {}

class WebsiteRssConfig
  extends Model<WebsiteRssConfigAttributes, ModelCreationAttributes>
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