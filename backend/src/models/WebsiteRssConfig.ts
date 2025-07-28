import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  SelectorField,
  WebsiteRssSelector,
  WebsiteRssAuth,
  WebsiteRssScript,
  WebsiteRssConfigAttributes,
  WebsiteRssConfigCreationAttributes,
} from "@feedhub/shared";

// 重新导出类型以供其他模块使用
export {
  SelectorField,
  WebsiteRssSelector,
  WebsiteRssAuth,
  WebsiteRssScript,
  WebsiteRssConfigAttributes,
  WebsiteRssConfigCreationAttributes,
};

// Sequelize 模型创建属性接口
interface ModelCreationAttributes
  extends Optional<WebsiteRssConfigAttributes, "id" | "lastContent" | "lastFetchTime"> {}

class WebsiteRssConfig
  extends Model<WebsiteRssConfigAttributes, ModelCreationAttributes>
  implements WebsiteRssConfigAttributes
{
  public id!: number;
  public key!: string;
  public title!: string;
  public url!: string;
  public selector!: WebsiteRssSelector;
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
    selector: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    auth: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        enabled: false,
        authType: "none",
      },
    },
    authCredentialId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "授权信息ID",
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
