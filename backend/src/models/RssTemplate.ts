import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// 模板参数接口
export interface TemplateParameter {
  name: string; // 参数名
  label: string; // 显示名称
  type: "string" | "number" | "select"; // 参数类型
  required: boolean; // 是否必需
  defaultValue?: string; // 默认值
  options?: string[]; // 选项（用于select类型）
  description?: string; // 参数描述
}

// 模板配置接口
export interface RssTemplateAttributes {
  id: number;
  name: string; // 模板名称
  description: string; // 模板描述
  platform: string; // 平台名称（如：bilibili、youtube等）
  icon: string; // 平台图标
  urlTemplate: string; // URL模板
  scriptTemplate: string; // 脚本模板
  parameters: TemplateParameter[]; // 模板参数定义
  enabled: boolean; // 是否启用
  createdAt: Date;
  updatedAt: Date;
}

interface RssTemplateCreationAttributes extends Optional<RssTemplateAttributes, "id" | "createdAt" | "updatedAt"> {}

class RssTemplate
  extends Model<RssTemplateAttributes, RssTemplateCreationAttributes>
  implements RssTemplateAttributes
{
  public id!: number;
  public name!: string;
  public description!: string;
  public platform!: string;
  public icon!: string;
  public urlTemplate!: string;
  public scriptTemplate!: string;
  public parameters!: TemplateParameter[];
  public enabled!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

RssTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    urlTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    scriptTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "RssTemplate",
    tableName: "rss_templates",
  }
);

export default RssTemplate; 