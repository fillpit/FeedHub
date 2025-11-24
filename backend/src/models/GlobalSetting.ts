import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface GlobalSettingAttributes {
  id: number;
  httpProxyHost: string;
  httpProxyPort: number;
  isProxyEnabled: boolean;
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

interface GlobalSettingCreationAttributes extends Optional<GlobalSettingAttributes, "id"> {}

class GlobalSetting
  extends Model<GlobalSettingAttributes, GlobalSettingCreationAttributes>
  implements GlobalSettingAttributes
{
  public id!: number;
  public httpProxyHost!: string;
  public httpProxyPort!: number;
  public isProxyEnabled!: boolean;
  // OPDS 设置
  public opdsEnabled?: boolean;
  public opdsServerUrl?: string;
  public opdsUsername?: string;
  public opdsPassword?: string;
  // 翻译配置
  public translationTargetLanguage?: string;
  public translationPrompt?: string;
  public translationApiBase?: string;
  public translationApiKey?: string;
  public translationModel?: string;
}

GlobalSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    httpProxyHost: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "127.0.0.1",
    },
    httpProxyPort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7890,
    },
    isProxyEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // OPDS 设置
    opdsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    opdsServerUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    opdsUsername: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    opdsPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    // 翻译配置
    translationTargetLanguage: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "en-US",
      comment: "翻译目标语言，如 en-US、ja-JP 等",
    },
    translationPrompt: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "请将输入内容翻译为目标语言，并保留原文，输出格式为：原文\\n\\n译文",
      comment: "翻译提示词，用于指导AI大模型翻译风格",
    },
    translationApiBase: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
      comment: "OpenAI兼容模型接口Base URL",
    },
    translationApiKey: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
      comment: "模型接口密钥",
    },
    translationModel: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "gpt-4o-mini",
      comment: "模型名称",
    },
  },
  {
    sequelize,
    modelName: "GlobalSetting",
    tableName: "global_settings",
  }
);

export default GlobalSetting;
